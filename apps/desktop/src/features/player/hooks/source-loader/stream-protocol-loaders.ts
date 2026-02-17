import Hls from 'hls.js';
import * as dashjs from 'dashjs';
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
        callbacks.onFeedback('已使用 hls.js 加载 m3u8 流。');
        callbacks.onToast('已启用 HLS 流播放（m3u8）。', 'info');
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) {
            return;
        }

        const reason = `HLS 致命错误：${data.type}/${data.details}`;
        callbacks.onFeedback(`播放失败：${reason}`);
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
        const reason = `DASH 错误：${event?.error?.message ?? '未知异常'}`;
        callbacks.onFeedback(`播放失败：${reason}`);
        callbacks.onToast(reason, 'error');
    });

    callbacks.onFeedback('已使用 dash.js 加载 mpd 流。');
    callbacks.onToast('已启用 DASH 流播放（mpd）。', 'info');
}
