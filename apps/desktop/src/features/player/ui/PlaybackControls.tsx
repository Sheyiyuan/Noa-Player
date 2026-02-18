import {
    Camera,
    Crop,
    Pause,
    Play,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

type PlaybackControlsProps = {
    isPlaying: boolean;
    isMuted: boolean;
    rate: number;
    volume: number;
    onTogglePlay: () => void | Promise<void>;
    onSeekBy: (deltaMs: number) => void;
    onToggleMute: () => void;
    onSetPlaybackRate: (value: number) => void;
    onSetPlaybackVolume: (value: number) => void;
    onCaptureFullFrame: () => void | Promise<unknown>;
    onStartRegionCapture: () => void;
};

export function PlaybackControls({
    isPlaying,
    isMuted,
    rate,
    volume,
    onTogglePlay,
    onSeekBy,
    onToggleMute,
    onSetPlaybackRate,
    onSetPlaybackVolume,
    onCaptureFullFrame,
    onStartRegionCapture,
}: PlaybackControlsProps) {
    const { t } = useTranslation();

    return (
        <div className="controls-row">
            <button
                type="button"
                className="icon-button"
                aria-label={isPlaying ? t('controls.pause') : t('controls.play')}
                data-tooltip={isPlaying ? t('controls.pause') : t('controls.play')}
                title={isPlaying ? t('controls.pause') : t('controls.play')}
                onClick={onTogglePlay}
            >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
                type="button"
                className="icon-button"
                aria-label={t('controls.back5')}
                data-tooltip={t('controls.back5')}
                title={t('controls.back5')}
                onClick={() => onSeekBy(-5000)}
            >
                <SkipBack size={16} />
            </button>
            <button
                type="button"
                className="icon-button"
                aria-label={t('controls.forward5')}
                data-tooltip={t('controls.forward5')}
                title={t('controls.forward5')}
                onClick={() => onSeekBy(5000)}
            >
                <SkipForward size={16} />
            </button>
            <button
                type="button"
                className="icon-button"
                aria-label={isMuted ? t('controls.unmute') : t('controls.mute')}
                data-tooltip={isMuted ? t('controls.unmute') : t('controls.mute')}
                title={isMuted ? t('controls.unmute') : t('controls.mute')}
                onClick={onToggleMute}
            >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <label>
                {t('controls.speed')}
                <select value={rate} onChange={(event) => onSetPlaybackRate(Number(event.target.value))}>
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                </select>
            </label>
            <label>
                {t('controls.volume')}
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(event) => onSetPlaybackVolume(Number(event.target.value))}
                />
            </label>
            <button
                type="button"
                className="icon-button"
                aria-label={t('controls.capture')}
                data-tooltip={t('controls.capture')}
                title={t('controls.capture')}
                onClick={onCaptureFullFrame}
            >
                <Camera size={16} />
            </button>
            <button
                type="button"
                className="icon-button"
                aria-label={t('controls.captureRegion')}
                data-tooltip={t('controls.captureRegion')}
                title={t('controls.captureRegion')}
                onClick={onStartRegionCapture}
            >
                <Crop size={16} />
            </button>
        </div>
    );
}
