import {
    Camera,
    Crop,
    FileText,
    Pause,
    Play,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
} from 'lucide-react';

type PlaybackControlsProps = {
    isPlaying: boolean;
    isMuted: boolean;
    rate: number;
    volume: number;
    isOcrRunning: boolean;
    onTogglePlay: () => void | Promise<void>;
    onSeekBy: (deltaMs: number) => void;
    onToggleMute: () => void;
    onSetPlaybackRate: (value: number) => void;
    onSetPlaybackVolume: (value: number) => void;
    onCaptureFullFrame: () => void | Promise<unknown>;
    onCaptureFullFrameWithOcr: () => void | Promise<void>;
    onStartRegionCapture: () => void;
};

export function PlaybackControls({
    isPlaying,
    isMuted,
    rate,
    volume,
    isOcrRunning,
    onTogglePlay,
    onSeekBy,
    onToggleMute,
    onSetPlaybackRate,
    onSetPlaybackVolume,
    onCaptureFullFrame,
    onCaptureFullFrameWithOcr,
    onStartRegionCapture,
}: PlaybackControlsProps) {
    return (
        <div className="controls-row">
            <button
                type="button"
                className="icon-button"
                aria-label={isPlaying ? '暂停' : '播放'}
                data-tooltip={isPlaying ? '暂停' : '播放'}
                title={isPlaying ? '暂停' : '播放'}
                onClick={onTogglePlay}
            >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
                type="button"
                className="icon-button"
                aria-label="后退 5 秒"
                data-tooltip="后退 5 秒"
                title="后退 5 秒"
                onClick={() => onSeekBy(-5000)}
            >
                <SkipBack size={16} />
            </button>
            <button
                type="button"
                className="icon-button"
                aria-label="前进 5 秒"
                data-tooltip="前进 5 秒"
                title="前进 5 秒"
                onClick={() => onSeekBy(5000)}
            >
                <SkipForward size={16} />
            </button>
            <button
                type="button"
                className="icon-button"
                aria-label={isMuted ? '取消静音' : '静音'}
                data-tooltip={isMuted ? '取消静音' : '静音'}
                title={isMuted ? '取消静音' : '静音'}
                onClick={onToggleMute}
            >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <label>
                倍速
                <select value={rate} onChange={(event) => onSetPlaybackRate(Number(event.target.value))}>
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                </select>
            </label>
            <label>
                音量
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
                aria-label="全屏截图"
                data-tooltip="全屏截图"
                title="全屏截图"
                onClick={onCaptureFullFrame}
            >
                <Camera size={16} />
            </button>
            <button
                type="button"
                className="icon-button"
                aria-label="全屏截图并 OCR"
                data-tooltip={isOcrRunning ? 'OCR 处理中...' : '全屏截图并 OCR'}
                title={isOcrRunning ? 'OCR 处理中...' : '全屏截图并 OCR'}
                onClick={onCaptureFullFrameWithOcr}
                disabled={isOcrRunning}
            >
                <FileText size={16} />
            </button>
            <button
                type="button"
                className="icon-button"
                aria-label="区域截图"
                data-tooltip="区域截图"
                title="区域截图"
                onClick={onStartRegionCapture}
            >
                <Crop size={16} />
            </button>
        </div>
    );
}
