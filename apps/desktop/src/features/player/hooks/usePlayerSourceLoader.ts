import { useRef } from 'react';
import Hls from 'hls.js';
import { noaDesktopClient } from '../../../ipc';
import i18n from '../../../i18n';
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
    const expectedSourceUrlRef = useRef<string | null>(null);
    const fallbackSourceUrlRef = useRef<string | null>(null);
    const hasRetriedWithFallbackRef = useRef(false);
    const lastVideoErrorRef = useRef<{ source: string; code: number; at: number } | null>(null);
    const suppressVideoErrorUntilRef = useRef(0);
    const fatalSourceRef = useRef<string | null>(null);

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

    const applyVideoSource = async (nextSourceUrl: string, fallbackSourceUrl?: string) => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        fallbackSourceUrlRef.current = fallbackSourceUrl ?? null;
        hasRetriedWithFallbackRef.current = false;
        lastVideoErrorRef.current = null;
        fatalSourceRef.current = null;
        suppressVideoErrorUntilRef.current = Date.now() + 1200;

        const trimmedSource = nextSourceUrl.trim();
        const isLocalLikeSource = /^(blob:|file:|data:)/i.test(trimmedSource);

        if (isLocalLikeSource) {
            expectedSourceUrlRef.current = trimmedSource;
            releaseVideoSource();
            video.pause();
            video.removeAttribute('src');
            video.load();

            video.src = trimmedSource;
            video.load();
            setSourceUrl(trimmedSource);
            setCurrentTimeMs(0);
            setDurationMs(0);
            setPlaying(false);
            setBuffering(false);
            onFeedback(i18n.t('feedback.sourceLoaded'));
            onToast(i18n.t('feedback.sourceLoadedToast'), 'success');
            return;
        }

        const parsedSource = parseSourceInput(nextSourceUrl);
        const sourceEntries = parsedSource.entries;
        if (!sourceEntries.length) {
            onFeedback(i18n.t('feedback.sourceInputInvalid'));
            onToast(i18n.t('feedback.sourceUrlInvalid'), 'error');
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
                onFeedback(i18n.t('feedback.mediaHeaderRegisterFailed', { message: registerResult.error.message }));
                onToast(i18n.t('feedback.mediaHeaderRegisterFailedToast'), 'error');
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
            onFeedback(i18n.t('feedback.multiSourceUnsupported'));
            onToast(i18n.t('feedback.multiSourceUnsupportedToast'), 'error');
            return;
        }

        const resolvedSourceUrl = sourceEntries.length === 1 ? sourceEntries[0].url : nextSourceUrl;
        expectedSourceUrlRef.current = resolvedSourceUrl;

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
                onFeedback(i18n.t('feedback.missingVideoSegment'));
                onToast(i18n.t('feedback.missingVideoSegmentToast'), 'error');
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
                const message = error instanceof Error ? error.message : i18n.t('feedback.unknownError');
                onFeedback(i18n.t('feedback.m4sLoadFailed', { message }));
                onToast(i18n.t('feedback.m4sLoadFailedToast', { message }), 'error');
                return;
            }
        } else if (isDualDirectSource) {
            onFeedback(i18n.t('feedback.dualDirectDetected'));
            onToast(i18n.t('feedback.dualDirectDetectedToast'), 'info');
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
                const message = error instanceof Error ? error.message : i18n.t('feedback.unknownError');
                onFeedback(i18n.t('feedback.dualDirectLoadFailed', { message }));
                onToast(i18n.t('feedback.dualDirectLoadFailedToast', { message }), 'error');
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
            const reason = i18n.t('feedback.m4sSingleUnsupported');
            onFeedback(i18n.t('feedback.playbackFailed', { reason }));
            onToast(reason, 'error');
            return;
        } else {
            video.src = resolvedSourceUrl;
            video.load();
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
                onFeedback(i18n.t('feedback.sourceLoadedJson', { titleSuffix }));
            } else {
                onFeedback(i18n.t('feedback.sourceLoaded'));
            }
            onToast(i18n.t('feedback.sourceLoadedToast'), 'success');
        }
    };

    const onVideoError = () => {
        if (Date.now() < suppressVideoErrorUntilRef.current) {
            return;
        }

        const currentSourceUrl = videoRef.current?.currentSrc || videoRef.current?.src || null;
        if (!currentSourceUrl || currentSourceUrl === 'about:blank') {
            return;
        }

        if (fatalSourceRef.current === currentSourceUrl) {
            return;
        }

        const mediaErrorCode = videoRef.current?.error?.code ?? 0;
        const lastVideoError = lastVideoErrorRef.current;
        const now = Date.now();
        if (
            lastVideoError
            && lastVideoError.source === currentSourceUrl
            && lastVideoError.code === mediaErrorCode
            && now - lastVideoError.at < 1800
        ) {
            return;
        }
        lastVideoErrorRef.current = {
            source: currentSourceUrl,
            code: mediaErrorCode,
            at: now,
        };

        const reason = getMediaErrorMessage(videoRef.current?.error ?? null, currentSourceUrl);
        const sourceProtocol = currentSourceUrl.split(':')[0] || 'unknown';
        if (
            mediaErrorCode === 4
            && sourceProtocol === 'blob'
            && fallbackSourceUrlRef.current
            && !hasRetriedWithFallbackRef.current
        ) {
            hasRetriedWithFallbackRef.current = true;
            const fallback = fallbackSourceUrlRef.current;
            fallbackSourceUrlRef.current = null;
            onFeedback(i18n.t('feedback.localBlobFallbackRetry'));
            onToast(i18n.t('feedback.localBlobFallbackRetryToast'), 'info');
            void applyVideoSource(fallback);
            return;
        }

        const expectedSource = expectedSourceUrlRef.current;
        const shouldAttachDebug = sourceProtocol === 'blob' || sourceProtocol === 'file' || sourceProtocol === 'data';
        const debugSuffix = shouldAttachDebug
            ? ` (code=${mediaErrorCode}, protocol=${sourceProtocol}${expectedSource ? `, expected=${expectedSource.split(':')[0]}` : ''})`
            : '';
        const message = i18n.t('feedback.playbackFailed', { reason: `${reason}${debugSuffix}` });
        onFeedback(message);
        onToast(message, 'error');

        fatalSourceRef.current = currentSourceUrl;
        suppressVideoErrorUntilRef.current = Date.now() + 3000;
        const video = videoRef.current;
        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.load();
        }
        setPlaying(false);
        setBuffering(false);
    };

    return {
        applyVideoSource,
        releaseVideoSource,
        onVideoError,
    };
}
