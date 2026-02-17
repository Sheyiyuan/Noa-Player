import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { formatTime } from './player-utils';

type PlaybackStatusPanelProps = {
    durationMs: number;
    currentTimeMs: number;
    isSeekable: boolean;
    sourceUrl: string | null;
    isBuffering: boolean;
    isPlaying: boolean;
    feedback: string;
    onSeekTo: (nextTimeMs: number) => void;
    onProgressKeyboardSeek: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
};

export function PlaybackStatusPanel({
    durationMs,
    currentTimeMs,
    isSeekable,
    sourceUrl,
    isBuffering,
    isPlaying,
    feedback,
    onSeekTo,
    onProgressKeyboardSeek,
}: PlaybackStatusPanelProps) {
    return (
        <>
            <div className="progress-row">
                <input
                    type="range"
                    min={0}
                    max={Math.max(durationMs, 0)}
                    step={100}
                    value={Math.min(currentTimeMs, Math.max(durationMs, 0))}
                    disabled={!isSeekable}
                    onChange={(event) => onSeekTo(Number(event.target.value))}
                    onKeyDown={onProgressKeyboardSeek}
                />
                <span>{isSeekable ? '可拖动定位' : '等待可定位...'}</span>
            </div>

            <div className="status-row">
                <span>来源：{sourceUrl ?? '未加载'}</span>
                <span>时间：{formatTime(currentTimeMs)} / {formatTime(durationMs)}</span>
                <span className="status-chip">{isBuffering ? '缓冲中' : isPlaying ? '播放中' : '已暂停'}</span>
            </div>

            <pre className="output">{feedback}（快捷键：空格 播放/暂停，←/→ 快进快退，M 静音）</pre>
        </>
    );
}
