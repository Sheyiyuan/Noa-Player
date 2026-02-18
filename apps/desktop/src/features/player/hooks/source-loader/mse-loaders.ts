import type { SourceLoaderCallbacks } from './types';
import i18n from '../../../../i18n';

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
            reject(new Error(i18n.t('feedback.mseAppendFailed')));
        };

        sourceBuffer.addEventListener('updateend', onUpdateEnd);
        sourceBuffer.addEventListener('error', onError);

        try {
            sourceBuffer.appendBuffer(buffer);
        } catch (error) {
            cleanup();
            reject(error instanceof Error ? error : new Error(i18n.t('feedback.mseAppendUnknown')));
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
        throw new Error(i18n.t('feedback.mseNotSupportedM4s'));
    }

    callbacks.onToast(i18n.t('feedback.mseLoadingSegments', { count: segmentRequests.length }), 'info');

    const firstResponse = await fetch(segmentRequests[0].url, {
        headers: segmentRequests[0].requestHeaders,
    });
    if (!firstResponse.ok) {
        throw new Error(i18n.t('feedback.mseSegmentDownloadFailed', { index: 1, status: firstResponse.status }));
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
        throw new Error(i18n.t('feedback.mseCodecUnsupported'));
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
        throw new Error(i18n.t('feedback.mseSingleTrackCodecDetectFailed', { reason }));
    }

    objectUrlRef.current = selectedObjectUrl;
    void video.play().catch(() => undefined);

    for (let index = 1; index < segmentRequests.length; index += 1) {
        callbacks.onFeedback(i18n.t('feedback.mseDownloadingVideoSegment', { index: index + 1, total: segmentRequests.length }));
        const response = await fetch(segmentRequests[index].url, {
            headers: segmentRequests[index].requestHeaders,
        });
        if (!response.ok) {
            throw new Error(i18n.t('feedback.mseSegmentDownloadFailed', { index: index + 1, status: response.status }));
        }

        await appendBufferAndWait(sourceBuffer, await response.arrayBuffer());
    }

    applyFiniteMediaSourceDuration(mediaSource, [sourceBuffer]);

    if (mediaSource.readyState === 'open') {
        mediaSource.endOfStream();
    }

    callbacks.onFeedback(i18n.t('feedback.mseMergedLoadDone', { count: segmentRequests.length, mimeType: selectedMimeType }));
    callbacks.onToast(i18n.t('feedback.mseMergedLoadDoneToast', { count: segmentRequests.length }), 'success');
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
        throw new Error(i18n.t('feedback.mseNotSupportedDualTrackM4s'));
    }

    callbacks.onToast(i18n.t('feedback.mseLoadingDualTrack', {
        videoCount: videoSegmentRequests.length,
        audioCount: audioSegmentRequests.length,
    }), 'info');

    const [videoFirstResponse, audioFirstResponse] = await Promise.all([
        fetch(videoSegmentRequests[0].url, { headers: videoSegmentRequests[0].requestHeaders }),
        fetch(audioSegmentRequests[0].url, { headers: audioSegmentRequests[0].requestHeaders }),
    ]);
    if (!videoFirstResponse.ok) {
        throw new Error(i18n.t('feedback.mseVideoSegmentDownloadFailed', { index: 1, status: videoFirstResponse.status }));
    }
    if (!audioFirstResponse.ok) {
        throw new Error(i18n.t('feedback.mseAudioSegmentDownloadFailed', { index: 1, status: audioFirstResponse.status }));
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
        throw new Error(i18n.t('feedback.mseDualTrackCodecUnsupported'));
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
        throw new Error(i18n.t('feedback.mseDualTrackDecodeFailed', { reason }));
    }

    objectUrlRef.current = selectedObjectUrl;
    void video.play().catch(() => undefined);

    for (let index = 1; index < videoSegmentRequests.length; index += 1) {
        callbacks.onFeedback(i18n.t('feedback.mseDownloadingVideoSegment', { index: index + 1, total: videoSegmentRequests.length }));
        const response = await fetch(videoSegmentRequests[index].url, {
            headers: videoSegmentRequests[index].requestHeaders,
        });
        if (!response.ok) {
            throw new Error(i18n.t('feedback.mseVideoSegmentDownloadFailed', { index: index + 1, status: response.status }));
        }
        await appendBufferAndWait(selectedVideoBuffer, await response.arrayBuffer());
    }

    for (let index = 1; index < audioSegmentRequests.length; index += 1) {
        callbacks.onFeedback(i18n.t('feedback.mseDownloadingAudioSegment', { index: index + 1, total: audioSegmentRequests.length }));
        const response = await fetch(audioSegmentRequests[index].url, {
            headers: audioSegmentRequests[index].requestHeaders,
        });
        if (!response.ok) {
            throw new Error(i18n.t('feedback.mseAudioSegmentDownloadFailed', { index: index + 1, status: response.status }));
        }
        await appendBufferAndWait(selectedAudioBuffer, await response.arrayBuffer());
    }

    applyFiniteMediaSourceDuration(selectedMediaSource, [selectedVideoBuffer, selectedAudioBuffer]);

    if (selectedMediaSource.readyState === 'open') {
        selectedMediaSource.endOfStream();
    }

    callbacks.onFeedback(i18n.t('feedback.mseDualTrackLoadDone', {
        videoCount: videoSegmentRequests.length,
        audioCount: audioSegmentRequests.length,
    }));
    callbacks.onToast(i18n.t('feedback.mseDualTrackLoadDoneToast', {
        videoCodec: selectedPair.video,
        audioCodec: selectedPair.audio,
    }), 'success');
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
        throw new Error(i18n.t('feedback.mseNotSupportedDualDirect'));
    }

    callbacks.onToast(i18n.t('feedback.mseLoadingDualDirect'), 'info');

    let videoResponse: Response;
    let audioResponse: Response;

    try {
        [videoResponse, audioResponse] = await Promise.all([
            fetch(videoUrl, { headers: videoHeaders }),
            fetch(audioUrl, { headers: audioHeaders }),
        ]);
    } catch (error) {
        const reason = error instanceof Error ? error.message : i18n.t('feedback.mseUnknownNetworkError');
        throw new Error(i18n.t('feedback.mseDirectRequestFailed', { reason }));
    }
    if (!videoResponse.ok) {
        throw new Error(i18n.t('feedback.mseVideoSegmentDownloadFailed', { index: 1, status: videoResponse.status }));
    }
    if (!audioResponse.ok) {
        throw new Error(i18n.t('feedback.mseAudioSegmentDownloadFailed', { index: 1, status: audioResponse.status }));
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
        throw new Error(i18n.t('feedback.mseAvCodecUnsupported'));
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
        throw new Error(i18n.t('feedback.mseDualDirectMergeFailed', { reason }));
    }

    objectUrlRef.current = selectedObjectUrl;
    void video.play().catch(() => undefined);

    callbacks.onFeedback(i18n.t('feedback.mseDualDirectLoadDone', {
        videoCodec: selectedPair.video,
        audioCodec: selectedPair.audio,
    }));
    callbacks.onToast(i18n.t('feedback.mseDualDirectLoadDoneToast'), 'success');
    return selectedObjectUrl;
}
