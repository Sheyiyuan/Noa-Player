import { useEffect, useState, type DragEvent as ReactDragEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime } from './player-utils';

type PlaybackStatusPanelProps = {
    durationMs: number;
    currentTimeMs: number;
    isSeekable: boolean;
    sourceUrl: string | null;
    isBuffering: boolean;
    isPlaying: boolean;
    playlist: Array<{ id: string; label: string }>;
    currentVideoId: string | null;
    feedback: string;
    onSelectVideo: (videoId: string) => void;
    onRenameVideo: (videoId: string) => void;
    onDeleteVideo: (videoId: string) => void;
    onReorderVideo: (draggedId: string, targetId: string) => void;
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
    playlist,
    currentVideoId,
    feedback,
    onSelectVideo,
    onRenameVideo,
    onDeleteVideo,
    onReorderVideo,
    onSeekTo,
    onProgressKeyboardSeek,
}: PlaybackStatusPanelProps) {
    const { t } = useTranslation();
    const [draggingVideoId, setDraggingVideoId] = useState<string | null>(null);
    const [dragOverVideoId, setDragOverVideoId] = useState<string | null>(null);
    const [playlistMenu, setPlaylistMenu] = useState<{ videoId: string; x: number; y: number } | null>(null);

    useEffect(() => {
        const closeMenu = () => setPlaylistMenu(null);
        const closeByEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setPlaylistMenu(null);
            }
        };

        window.addEventListener('click', closeMenu);
        window.addEventListener('keydown', closeByEscape);
        return () => {
            window.removeEventListener('click', closeMenu);
            window.removeEventListener('keydown', closeByEscape);
        };
    }, []);

    const onVideoDragStart = (event: ReactDragEvent<HTMLDivElement>, videoId: string) => {
        setDraggingVideoId(videoId);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', videoId);
    };

    const onVideoDrop = (event: ReactDragEvent<HTMLDivElement>, targetId: string) => {
        event.preventDefault();
        const draggedId = draggingVideoId ?? event.dataTransfer.getData('text/plain');
        if (!draggedId || draggedId === targetId) {
            setDraggingVideoId(null);
            setDragOverVideoId(null);
            return;
        }

        onReorderVideo(draggedId, targetId);
        setDraggingVideoId(null);
        setDragOverVideoId(null);
    };

    const clampMenuPosition = (rawX: number, rawY: number) => {
        const padding = 8;
        const menuWidth = 180;
        const menuHeight = 96;
        const maxX = Math.max(padding, window.innerWidth - menuWidth - padding);
        const maxY = Math.max(padding, window.innerHeight - menuHeight - padding);
        return {
            x: Math.min(Math.max(rawX, padding), maxX),
            y: Math.min(Math.max(rawY, padding), maxY),
        };
    };

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
                <span>{isSeekable ? t('status.seekable') : t('status.waitingSeekable')}</span>
            </div>

            <div className="status-row">
                <span>{t('status.source')}：{sourceUrl ?? t('status.sourceEmpty')}</span>
                <span>{t('status.time')}：{formatTime(currentTimeMs)} / {formatTime(durationMs)}</span>
                <span className="status-chip">{isBuffering ? t('status.buffering') : isPlaying ? t('status.playing') : t('status.paused')}</span>
            </div>

            <div className="playlist-panel">
                <div className="playlist-title-row">
                    <strong>{t('playlist.title', { count: playlist.length })}</strong>
                    <span>{feedback}</span>
                </div>
                {playlist.length === 0 ? (
                    <div className="playlist-empty">{t('playlist.empty')}</div>
                ) : (
                    <div className="playlist-items">
                        {playlist.map((item) => (
                            <div
                                key={item.id}
                                className={`playlist-row ${currentVideoId === item.id ? 'active' : ''} ${dragOverVideoId === item.id ? 'drag-over' : ''} ${draggingVideoId === item.id ? 'dragging' : ''}`}
                                draggable
                                onDragStart={(event) => onVideoDragStart(event, item.id)}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    if (draggingVideoId && draggingVideoId !== item.id) {
                                        setDragOverVideoId(item.id);
                                    }
                                }}
                                onDragLeave={() => {
                                    if (dragOverVideoId === item.id) {
                                        setDragOverVideoId(null);
                                    }
                                }}
                                onDrop={(event) => onVideoDrop(event, item.id)}
                                onDragEnd={() => {
                                    setDraggingVideoId(null);
                                    setDragOverVideoId(null);
                                }}
                                onContextMenu={(event) => {
                                    event.preventDefault();
                                    const clamped = clampMenuPosition(event.clientX, event.clientY);
                                    setPlaylistMenu({
                                        videoId: item.id,
                                        x: clamped.x,
                                        y: clamped.y,
                                    });
                                }}
                            >
                                <span className="playlist-drag-handle" title={t('playlist.dragSort')}>⋮⋮</span>
                                <button
                                    type="button"
                                    className="playlist-item"
                                    onClick={() => onSelectVideo(item.id)}
                                    title={item.label}
                                >
                                    {item.label}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {playlistMenu ? (
                <div
                    className="asset-menu"
                    style={{
                        left: `${playlistMenu.x}px`,
                        top: `${playlistMenu.y}px`,
                    }}
                    onClick={(event) => event.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => {
                            onRenameVideo(playlistMenu.videoId);
                            setPlaylistMenu(null);
                        }}
                    >
                        {t('playlist.rename')}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onDeleteVideo(playlistMenu.videoId);
                            setPlaylistMenu(null);
                        }}
                    >
                        {t('playlist.remove')}
                    </button>
                </div>
            ) : null}
        </>
    );
}
