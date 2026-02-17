import type { SourceLoaderCallbacks } from './types';

type SourceRequest = {
    url: string;
    requestHeaders?: Record<string, string>;
};

function getLastBufferedEnd(buffer: SourceBuffer): number {
    const { buffered } = buffer;
    if (!buffered || buffered.length === 0) {
        return 0;
    }

    return buffered.end(buffered.length - 1);
}

function applyFiniteMediaSourceDuration(mediaSource: MediaSource, buffers: SourceBuffer[]) {
    if (mediaSource.readyState !== 'open') {
        return;
    }

    const duration = Math.max(...buffers.map((buffer) => getLastBufferedEnd(buffer)), 0);
    if (Number.isFinite(duration) && duration > 0) {
        mediaSource.duration = duration;
    }
}

function appendBufferAndWait(sourceBuffer: SourceBuffer, buffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
        const cleanup = () => {
            sourceBuffer.removeEventListener('updateend', onUpdateEnd);
            sourceBuffer.removeEventListener('error', onError);
        };

        const onUpdateEnd = () => {
            cleanup();
            resolve();
        };

        const onError = () => {
            cleanup();
            reject(new Error('分片追加失败：SourceBuffer 错误'));
        };

        sourceBuffer.addEventListener('updateend', onUpdateEnd);
        sourceBuffer.addEventListener('error', onError);

        try {
            sourceBuffer.appendBuffer(buffer);
        } catch (error) {
            cleanup();
            reject(error instanceof Error ? error : new Error('分片追加失败：未知异常'));
        }
    });
}

export async function loadMergedM4sSource(params: {
    video: HTMLVideoElement;
    segmentRequests: SourceRequest[];
    objectUrlRef: React.MutableRefObject<string | null>;
    callbacks: SourceLoaderCallbacks;
}) {
    const { video, segmentRequests, objectUrlRef, callbacks } = params;

    if (!('MediaSource' in window)) {
        throw new Error('当前环境不支持 MediaSource，无法播放 m4s 分片');
    }

    callbacks.onToast(`正在流式加载 ${segmentRequests.length} 个 m4s 分片...`, 'info');

    const firstResponse = await fetch(segmentRequests[0].url, {
        headers: segmentRequests[0].requestHeaders,
    });
    if (!firstResponse.ok) {
        throw new Error(`分片 1 下载失败（HTTP ${firstResponse.status}）`);
    }
    const firstBuffer = await firstResponse.arrayBuffer();

    const videoMimeCandidates = [
        'video/mp4; codecs="avc1.64001e"',
        'video/mp4; codecs="avc1.4d401f"',
        'video/mp4; codecs="avc1.4d401e"',
        'video/mp4; codecs="avc1.42e01e"',
        'video/mp4; codecs="hev1.1.6.L120.90"',
        'video/mp4; codecs="hvc1.1.6.L120.90"',
        'video/mp4; codecs="av01.0.08M.08"',
        'video/mp4; codecs="vp09.00.10.08"',
        'video/mp4',
    ].filter((mimeType) => MediaSource.isTypeSupported(mimeType));

    if (!videoMimeCandidates.length) {
        throw new Error('浏览器不支持当前 m4s 编码，无法创建 SourceBuffer');
    }

    let selectedObjectUrl: string | null = null;
    let selectedMimeType = '';
    let mediaSource: MediaSource | null = null;
    let sourceBuffer: SourceBuffer | null = null;
    let lastError: unknown = null;

    for (const mimeType of videoMimeCandidates) {
        const candidateMediaSource = new MediaSource();
        const candidateObjectUrl = URL.createObjectURL(candidateMediaSource);

        try {
            video.src = candidateObjectUrl;
            const candidateSourceBuffer = await new Promise<SourceBuffer>((resolve, reject) => {
                const onSourceOpen = () => {
                    try {
                        resolve(candidateMediaSource.addSourceBuffer(mimeType));
                    } catch (error) {
                        reject(error);
                    }
                };

                candidateMediaSource.addEventListener('sourceopen', onSourceOpen, { once: true });
            });
            await appendBufferAndWait(candidateSourceBuffer, firstBuffer);

            selectedObjectUrl = candidateObjectUrl;
            selectedMimeType = mimeType;
            mediaSource = candidateMediaSource;
            sourceBuffer = candidateSourceBuffer;
            break;
        } catch (error) {
            lastError = error;
            URL.revokeObjectURL(candidateObjectUrl);
        }
    }

    if (!selectedObjectUrl || !mediaSource || !sourceBuffer) {
        const reason = lastError instanceof Error ? `：${lastError.message}` : '';
        throw new Error(`无法识别单轨 m4s 编码${reason}`);
    }

    objectUrlRef.current = selectedObjectUrl;
    void video.play().catch(() => undefined);

    for (let index = 1; index < segmentRequests.length; index += 1) {
        callbacks.onFeedback(`正在流式下载视频分片 ${index + 1}/${segmentRequests.length}...`);
        const response = await fetch(segmentRequests[index].url, {
            headers: segmentRequests[index].requestHeaders,
        });
        if (!response.ok) {
            throw new Error(`分片 ${index + 1} 下载失败（HTTP ${response.status}）`);
        }

        await appendBufferAndWait(sourceBuffer, await response.arrayBuffer());
    }

    applyFiniteMediaSourceDuration(mediaSource, [sourceBuffer]);

    if (mediaSource.readyState === 'open') {
        mediaSource.endOfStream();
    }

    callbacks.onFeedback(`m4s 流式加载完成（${segmentRequests.length} 个，${selectedMimeType}）。`);
    callbacks.onToast(`m4s 流式加载完成（${segmentRequests.length} 个）。`, 'success');
    return selectedObjectUrl;
}

export async function loadDualTrackM4sSource(params: {
    video: HTMLVideoElement;
    videoSegmentRequests: SourceRequest[];
    audioSegmentRequests: SourceRequest[];
    objectUrlRef: React.MutableRefObject<string | null>;
    callbacks: SourceLoaderCallbacks;
}) {
    const { video, videoSegmentRequests, audioSegmentRequests, objectUrlRef, callbacks } = params;

    if (!('MediaSource' in window)) {
        throw new Error('当前环境不支持 MediaSource，无法播放双轨 m4s');
    }

    callbacks.onToast(`正在加载双轨分片（视频 ${videoSegmentRequests.length}，音频 ${audioSegmentRequests.length}）...`, 'info');

    const [videoFirstResponse, audioFirstResponse] = await Promise.all([
        fetch(videoSegmentRequests[0].url, { headers: videoSegmentRequests[0].requestHeaders }),
        fetch(audioSegmentRequests[0].url, { headers: audioSegmentRequests[0].requestHeaders }),
    ]);
    if (!videoFirstResponse.ok) {
        throw new Error(`视频分片 1 下载失败（HTTP ${videoFirstResponse.status}）`);
    }
    if (!audioFirstResponse.ok) {
        throw new Error(`音频分片 1 下载失败（HTTP ${audioFirstResponse.status}）`);
    }

    const [videoFirstBuffer, audioFirstBuffer] = await Promise.all([videoFirstResponse.arrayBuffer(), audioFirstResponse.arrayBuffer()]);

    const videoMimeCandidates = [
        'video/mp4; codecs="avc1.64001e"',
        'video/mp4; codecs="avc1.4d401f"',
        'video/mp4; codecs="avc1.4d401e"',
        'video/mp4; codecs="avc1.42e01e"',
        'video/mp4; codecs="hev1.1.6.L120.90"',
        'video/mp4; codecs="hvc1.1.6.L120.90"',
        'video/mp4; codecs="av01.0.08M.08"',
        'video/mp4; codecs="vp09.00.10.08"',
        'video/mp4',
    ].filter((mimeType) => MediaSource.isTypeSupported(mimeType));

    const audioMimeCandidates = [
        'audio/mp4; codecs="mp4a.40.2"',
        'audio/mp4; codecs="mp4a.40.5"',
        'audio/mp4; codecs="opus"',
        'audio/mp4',
    ].filter((mimeType) => MediaSource.isTypeSupported(mimeType));

    if (!videoMimeCandidates.length || !audioMimeCandidates.length) {
        throw new Error('浏览器不支持当前 m4s 编码，无法创建双轨 SourceBuffer');
    }

    let lastError: unknown = null;
    let selectedPair: { video: string; audio: string } | null = null;
    let selectedObjectUrl: string | null = null;
    let selectedMediaSource: MediaSource | null = null;
    let selectedVideoBuffer: SourceBuffer | null = null;
    let selectedAudioBuffer: SourceBuffer | null = null;

    for (const videoMimeType of videoMimeCandidates) {
        for (const audioMimeType of audioMimeCandidates) {
            const mediaSource = new MediaSource();
            const objectUrl = URL.createObjectURL(mediaSource);

            try {
                video.src = objectUrl;
                const { videoBuffer, audioBuffer } = await new Promise<{ videoBuffer: SourceBuffer; audioBuffer: SourceBuffer }>((resolve, reject) => {
                    const onSourceOpen = () => {
                        try {
                            resolve({
                                videoBuffer: mediaSource.addSourceBuffer(videoMimeType),
                                audioBuffer: mediaSource.addSourceBuffer(audioMimeType),
                            });
                        } catch (error) {
                            reject(error);
                        }
                    };

                    mediaSource.addEventListener('sourceopen', onSourceOpen, { once: true });
                });
                await appendBufferAndWait(videoBuffer, videoFirstBuffer);
                await appendBufferAndWait(audioBuffer, audioFirstBuffer);

                selectedPair = { video: videoMimeType, audio: audioMimeType };
                selectedObjectUrl = objectUrl;
                selectedMediaSource = mediaSource;
                selectedVideoBuffer = videoBuffer;
                selectedAudioBuffer = audioBuffer;
                break;
            } catch (error) {
                lastError = error;
                URL.revokeObjectURL(objectUrl);
            }
        }

        if (selectedPair && selectedObjectUrl) {
            break;
        }
    }

    if (!selectedPair || !selectedObjectUrl || !selectedMediaSource || !selectedVideoBuffer || !selectedAudioBuffer) {
        const reason = lastError instanceof Error ? `：${lastError.message}` : '';
        throw new Error(`双轨 m4s 解码失败，已尝试多种编码组合${reason}`);
    }

    objectUrlRef.current = selectedObjectUrl;
    void video.play().catch(() => undefined);

    for (let index = 1; index < videoSegmentRequests.length; index += 1) {
        callbacks.onFeedback(`正在流式下载视频分片 ${index + 1}/${videoSegmentRequests.length}...`);
        const response = await fetch(videoSegmentRequests[index].url, {
            headers: videoSegmentRequests[index].requestHeaders,
        });
        if (!response.ok) {
            throw new Error(`视频分片 ${index + 1} 下载失败（HTTP ${response.status}）`);
        }
        await appendBufferAndWait(selectedVideoBuffer, await response.arrayBuffer());
    }

    for (let index = 1; index < audioSegmentRequests.length; index += 1) {
        callbacks.onFeedback(`正在流式下载音频分片 ${index + 1}/${audioSegmentRequests.length}...`);
        const response = await fetch(audioSegmentRequests[index].url, {
            headers: audioSegmentRequests[index].requestHeaders,
        });
        if (!response.ok) {
            throw new Error(`音频分片 ${index + 1} 下载失败（HTTP ${response.status}）`);
        }
        await appendBufferAndWait(selectedAudioBuffer, await response.arrayBuffer());
    }

    applyFiniteMediaSourceDuration(selectedMediaSource, [selectedVideoBuffer, selectedAudioBuffer]);

    if (selectedMediaSource.readyState === 'open') {
        selectedMediaSource.endOfStream();
    }

    callbacks.onFeedback(`双轨 m4s 加载完成（视频 ${videoSegmentRequests.length}，音频 ${audioSegmentRequests.length}）。`);
    callbacks.onToast(`双轨 m4s 加载完成（${selectedPair.video} / ${selectedPair.audio}）。`, 'success');
    return selectedObjectUrl;
}

export async function loadDualTrackDirectSource(params: {
    video: HTMLVideoElement;
    videoUrl: string;
    audioUrl: string;
    videoHeaders?: Record<string, string>;
    audioHeaders?: Record<string, string>;
    objectUrlRef: React.MutableRefObject<string | null>;
    callbacks: SourceLoaderCallbacks;
}) {
    const { video, videoUrl, audioUrl, videoHeaders, audioHeaders, objectUrlRef, callbacks } = params;

    if (!('MediaSource' in window)) {
        throw new Error('当前环境不支持 MediaSource，无法播放双直链音视频');
    }

    callbacks.onToast('正在加载双直链音视频（MSE）...', 'info');

    let videoResponse: Response;
    let audioResponse: Response;

    try {
        [videoResponse, audioResponse] = await Promise.all([
            fetch(videoUrl, { headers: videoHeaders }),
            fetch(audioUrl, { headers: audioHeaders }),
        ]);
    } catch (error) {
        const reason = error instanceof Error ? error.message : '未知网络异常';
        throw new Error(`直链请求失败（可能为链接过期或鉴权头缺失）：${reason}`);
    }
    if (!videoResponse.ok) {
        throw new Error(`视频直链下载失败（HTTP ${videoResponse.status}）`);
    }
    if (!audioResponse.ok) {
        throw new Error(`音频直链下载失败（HTTP ${audioResponse.status}）`);
    }

    const [videoBuffer, audioBuffer] = await Promise.all([videoResponse.arrayBuffer(), audioResponse.arrayBuffer()]);

    const videoMimeCandidates = [
        'video/mp4; codecs="avc1.64001e"',
        'video/mp4; codecs="avc1.4d401f"',
        'video/mp4; codecs="avc1.4d401e"',
        'video/mp4; codecs="hev1.1.6.L120.90"',
        'video/mp4; codecs="hvc1.1.6.L120.90"',
        'video/mp4; codecs="av01.0.08M.08"',
        'video/mp4; codecs="vp09.00.10.08"',
        'video/mp4',
        'video/webm; codecs="vp9"',
        'video/webm; codecs="vp8"',
        'video/webm; codecs="av1"',
        'video/webm',
    ].filter((mimeType) => MediaSource.isTypeSupported(mimeType));

    const audioMimeCandidates = [
        'audio/mp4; codecs="mp4a.40.2"',
        'audio/mp4; codecs="mp4a.40.5"',
        'audio/mp4; codecs="opus"',
        'audio/mp4',
        'audio/webm; codecs="opus"',
        'audio/webm; codecs="vorbis"',
        'audio/webm',
    ].filter((mimeType) => MediaSource.isTypeSupported(mimeType));

    if (!videoMimeCandidates.length || !audioMimeCandidates.length) {
        throw new Error('浏览器不支持当前音视频编码，无法创建双轨 SourceBuffer');
    }

    let lastError: unknown = null;
    let selectedPair: { video: string; audio: string } | null = null;
    let selectedObjectUrl: string | null = null;

    for (const videoMimeType of videoMimeCandidates) {
        for (const audioMimeType of audioMimeCandidates) {
            const mediaSource = new MediaSource();
            const objectUrl = URL.createObjectURL(mediaSource);

            try {
                video.src = objectUrl;
                const { videoBufferRef, audioBufferRef } = await new Promise<{ videoBufferRef: SourceBuffer; audioBufferRef: SourceBuffer }>((resolve, reject) => {
                    const onSourceOpen = () => {
                        try {
                            resolve({
                                videoBufferRef: mediaSource.addSourceBuffer(videoMimeType),
                                audioBufferRef: mediaSource.addSourceBuffer(audioMimeType),
                            });
                        } catch (error) {
                            reject(error);
                        }
                    };

                    mediaSource.addEventListener('sourceopen', onSourceOpen, { once: true });
                });
                await appendBufferAndWait(videoBufferRef, videoBuffer);
                await appendBufferAndWait(audioBufferRef, audioBuffer);

                applyFiniteMediaSourceDuration(mediaSource, [videoBufferRef, audioBufferRef]);

                if (mediaSource.readyState === 'open') {
                    mediaSource.endOfStream();
                }

                selectedPair = { video: videoMimeType, audio: audioMimeType };
                selectedObjectUrl = objectUrl;
                break;
            } catch (error) {
                lastError = error;
                URL.revokeObjectURL(objectUrl);
            }
        }

        if (selectedPair && selectedObjectUrl) {
            break;
        }
    }

    if (!selectedPair || !selectedObjectUrl) {
        const reason = lastError instanceof Error ? `：${lastError.message}` : '';
        throw new Error(`双直链合流失败，已尝试多种编码组合${reason}`);
    }

    objectUrlRef.current = selectedObjectUrl;
    void video.play().catch(() => undefined);

    callbacks.onFeedback(`双直链加载完成（${selectedPair.video} / ${selectedPair.audio}）。`);
    callbacks.onToast('双直链音视频已加载。', 'success');
    return selectedObjectUrl;
}
