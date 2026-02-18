import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import i18n from '../../../../i18n';
import type { SourceLoaderCallbacks } from './types';

export function loadHlsSource(params: {
    video: HTMLVideoElement;
    sourceUrl: string;
    hlsRef: React.MutableRefObject<Hls | null>;
    callbacks: SourceLoaderCallbacks;
}) {
    const { video, sourceUrl, hlsRef, callbacks } = params;
    const hls = new Hls();
    hlsRef.current = hls;

    hls.attachMedia(video);
    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(sourceUrl);
        callbacks.onFeedback(i18n.t('feedback.hlsLoaded'));
        callbacks.onToast(i18n.t('feedback.hlsLoadedToast'), 'info');
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) {
            return;
        }

        const reason = i18n.t('feedback.hlsFatalError', { type: data.type, details: data.details });
        callbacks.onFeedback(i18n.t('feedback.playbackFailed', { reason }));
        callbacks.onToast(reason, 'error');
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
        } else {
            hls.destroy();
            hlsRef.current = null;
        }
    });
}

export function loadDashSource(params: {
    video: HTMLVideoElement;
    sourceUrl: string;
    dashRef: React.MutableRefObject<any>;
    callbacks: SourceLoaderCallbacks;
}) {
    const { video, sourceUrl, dashRef, callbacks } = params;
    const player = dashjs.MediaPlayer().create();
    dashRef.current = player;

    player.initialize(video, sourceUrl, false);
    player.on(dashjs.MediaPlayer.events.ERROR, (event: { error?: { message?: string } }) => {
        const reason = i18n.t('feedback.dashError', { message: event?.error?.message ?? i18n.t('feedback.unknownError') });
        callbacks.onFeedback(i18n.t('feedback.playbackFailed', { reason }));
        callbacks.onToast(reason, 'error');
    });

    callbacks.onFeedback(i18n.t('feedback.dashLoaded'));
    callbacks.onToast(i18n.t('feedback.dashLoadedToast'), 'info');
}
