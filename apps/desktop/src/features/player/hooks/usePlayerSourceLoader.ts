import { useRef } from 'react';
import Hls from 'hls.js';
import { noaDesktopClient } from '../../../ipc';
import {
    isM3u8Source,
    isM4sSource,
    isMpdSource,
    parseSourceInput,
} from './source-loader/parse-input';
import { getMediaErrorMessage } from './source-loader/media-error';
import { loadDualTrackDirectSource, loadDualTrackM4sSource, loadMergedM4sSource } from './source-loader/mse-loaders';
import { loadDashSource, loadHlsSource } from './source-loader/stream-protocol-loaders';
import type { SourceLoaderCallbacks } from './source-loader/types';

type Params = {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onFeedback: (message: string) => void;
    onToast: (message: string, level?: 'info' | 'success' | 'error') => void;
    setSourceUrl: (value: string | null) => void;
    setCurrentTimeMs: (value: number) => void;
    setDurationMs: (value: number) => void;
    setPlaying: (value: boolean) => void;
    setBuffering: (value: boolean) => void;
};

export function usePlayerSourceLoader({
    videoRef,
    onFeedback,
    onToast,
    setSourceUrl,
    setCurrentTimeMs,
    setDurationMs,
    setPlaying,
    setBuffering,
}: Params) {
    const hlsRef = useRef<Hls | null>(null);
    const dashRef = useRef<any>(null);
    const objectUrlRef = useRef<string | null>(null);

    const callbacks: SourceLoaderCallbacks = {
        onFeedback,
        onToast,
    };

    const releaseVideoSource = () => {
        hlsRef.current?.destroy();
        hlsRef.current = null;

        dashRef.current?.reset?.();
        dashRef.current = null;

        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    };

    const applyVideoSource = async (nextSourceUrl: string) => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        const parsedSource = parseSourceInput(nextSourceUrl);
        const sourceEntries = parsedSource.entries;
        if (!sourceEntries.length) {
            onFeedback('未识别到有效输入，请粘贴直链或符合约定的 JSON 源配置。');
            onToast('未识别到有效 URL。', 'error');
            return;
        }

        const sourceUrls = sourceEntries.map((entry) => entry.url);

        const mediaHeaderItems = sourceEntries
            .filter((entry) => entry.requestHeaders && Object.keys(entry.requestHeaders).length > 0)
            .map((entry) => ({
                url: entry.url,
                headers: entry.requestHeaders as Record<string, string>,
            }));

        if (mediaHeaderItems.length > 0) {
            const registerResult = await noaDesktopClient.registerMediaHeaders({ items: mediaHeaderItems });
            if (!registerResult.ok) {
                onFeedback(`媒体请求头注册失败：${registerResult.error.message}`);
                onToast('媒体请求头注册失败，可能导致部分链接 403。', 'error');
            }
        }

        const isMultiM4s = sourceEntries.length > 1 && sourceUrls.every((url) => isM4sSource(url));
        const videoDirectEntries = sourceEntries.filter((entry) => entry.track !== 'audio');
        const audioDirectEntries = sourceEntries.filter((entry) => entry.track === 'audio');
        const isDualDirectSource =
            !isMultiM4s
            && sourceEntries.length === 2
            && videoDirectEntries.length === 1
            && audioDirectEntries.length === 1;

        if (sourceEntries.length > 1 && !isMultiM4s && !isDualDirectSource) {
            onFeedback('多链接模式仅支持：双直链（1 视频 + 1 音频）或 m4s 分片。');
            onToast('多链接格式不支持：请使用双直链或 m4s 分片。', 'error');
            return;
        }

        const resolvedSourceUrl = sourceEntries.length === 1 ? sourceEntries[0].url : nextSourceUrl;

        releaseVideoSource();
        video.pause();
        video.removeAttribute('src');
        video.load();

        if (isMultiM4s) {
            const videoSegmentRequests = videoDirectEntries.map((entry) => ({
                url: entry.url,
                requestHeaders: entry.requestHeaders,
            }));
            const audioSegmentRequests = audioDirectEntries.map((entry) => ({
                url: entry.url,
                requestHeaders: entry.requestHeaders,
            }));

            if (audioSegmentRequests.length > 0 && videoSegmentRequests.length === 0) {
                onFeedback('播放失败：检测到音频分片，但缺少视频分片。');
                onToast('多分片加载失败：缺少视频分片。', 'error');
                return;
            }

            try {
                if (audioSegmentRequests.length > 0) {
                    await loadDualTrackM4sSource({
                        video,
                        videoSegmentRequests,
                        audioSegmentRequests,
                        objectUrlRef,
                        callbacks,
                    });
                } else {
                    await loadMergedM4sSource({
                        video,
                        segmentRequests: videoSegmentRequests,
                        objectUrlRef,
                        callbacks,
                    });
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : '未知错误';
                onFeedback(`播放失败：m4s 多分片加载失败：${message}`);
                onToast(`m4s 多分片加载失败：${message}`, 'error');
                return;
            }
        } else if (isDualDirectSource) {
            onFeedback('检测到双直链输入（1 视频 + 1 音频），正在使用 MSE 合流加载。');
            onToast('检测到双直链，正在合流加载。', 'info');
            try {
                await loadDualTrackDirectSource({
                    video,
                    videoUrl: videoDirectEntries[0].url,
                    audioUrl: audioDirectEntries[0].url,
                    videoHeaders: videoDirectEntries[0].requestHeaders,
                    audioHeaders: audioDirectEntries[0].requestHeaders,
                    objectUrlRef,
                    callbacks,
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : '未知错误';
                onFeedback(`播放失败：双直链加载失败：${message}`);
                onToast(`双直链加载失败：${message}`, 'error');
                return;
            }
        } else if (isM3u8Source(resolvedSourceUrl) && Hls.isSupported()) {
            loadHlsSource({
                video,
                sourceUrl: resolvedSourceUrl,
                hlsRef,
                callbacks,
            });
        } else if (isMpdSource(resolvedSourceUrl)) {
            loadDashSource({
                video,
                sourceUrl: resolvedSourceUrl,
                dashRef,
                callbacks,
            });
        } else if (isM4sSource(resolvedSourceUrl)) {
            const reason = 'm4s 为分片流片段，通常不能单独播放，请改用 mpd/m3u8 或完整 mp4 直链。';
            onFeedback(`播放失败：${reason}`);
            onToast(reason, 'error');
            return;
        } else {
            video.src = resolvedSourceUrl;
        }

        if (isMultiM4s) {
            const audioCount = sourceEntries.filter((entry) => entry.track === 'audio').length;
            const videoCount = sourceEntries.length - audioCount;
            setSourceUrl(audioCount > 0 ? `m4s://mse(video:${videoCount},audio:${audioCount})` : `m4s://merged(${videoCount})`);
        } else if (isDualDirectSource) {
            setSourceUrl('mse://dual-direct(video:1,audio:1)');
        } else {
            setSourceUrl(resolvedSourceUrl);
        }

        const parsedDurationMs = parsedSource.durationSeconds ? parsedSource.durationSeconds * 1000 : 0;

        setCurrentTimeMs(0);
        setDurationMs(parsedDurationMs);
        setPlaying(false);
        setBuffering(false);

        if (!isMultiM4s) {
            if (parsedSource.fromYtDlpJson) {
                const titleSuffix = parsedSource.title ? `：${parsedSource.title}` : '';
                onFeedback(`已加载 JSON 视频源${titleSuffix}，可进行播放与截图。`);
            } else {
                onFeedback('视频已加载，可进行播放与截图。');
            }
            onToast('视频源已加载。', 'success');
        }
    };

    const onVideoError = () => {
        const reason = getMediaErrorMessage(videoRef.current?.error ?? null);
        onFeedback(`播放失败：${reason}`);
        onToast(`播放失败：${reason}`, 'error');
    };

    return {
        applyVideoSource,
        releaseVideoSource,
        onVideoError,
    };
}
