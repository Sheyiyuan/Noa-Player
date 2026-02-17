import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import Hls from 'hls.js';
import { noaDesktopClient } from '../../../ipc';
import { useAssetStore } from '../../../shared/state/asset-store';
import { usePlaybackStore } from '../../../shared/state/playback-store';

type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type ToastLevel = 'info' | 'success' | 'error';

type ToastItem = {
    id: number;
    level: ToastLevel;
    message: string;
};

type AssetMenuState = {
    assetId: string;
    x: number;
    y: number;
};

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function isM3u8Source(url: string): boolean {
    return /\.m3u8($|\?)/i.test(url);
}

function getMediaErrorMessage(error: MediaError | null): string {
    if (!error) {
        return '未知媒体错误，请检查视频链接和网络状态。';
    }

    switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
            return '播放被中断（可能是主动切换了视频源）。';
        case error.MEDIA_ERR_NETWORK:
            return '网络错误：视频资源请求失败，请检查链接是否可访问。';
        case error.MEDIA_ERR_DECODE:
            return '解码失败：当前视频编码可能不受支持。';
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            return '资源不支持：格式不受支持或跨域策略阻止加载。';
        default:
            return '媒体加载失败，请检查格式、链接或跨域设置。';
    }
}

export function PlayerWorkbench() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const objectUrlRef = useRef<string | null>(null);

    const sourceUrl = usePlaybackStore((state) => state.sourceUrl);
    const currentTimeMs = usePlaybackStore((state) => state.currentTimeMs);
    const durationMs = usePlaybackStore((state) => state.durationMs);
    const isPlaying = usePlaybackStore((state) => state.isPlaying);
    const rate = usePlaybackStore((state) => state.rate);
    const volume = usePlaybackStore((state) => state.volume);
    const setSourceUrl = usePlaybackStore((state) => state.setSourceUrl);
    const setCurrentTimeMs = usePlaybackStore((state) => state.setCurrentTimeMs);
    const setDurationMs = usePlaybackStore((state) => state.setDurationMs);
    const setPlaying = usePlaybackStore((state) => state.setPlaying);
    const setRate = usePlaybackStore((state) => state.setRate);
    const setVolume = usePlaybackStore((state) => state.setVolume);

    const items = useAssetStore((state) => state.items);
    const addItem = useAssetStore((state) => state.addItem);
    const removeItem = useAssetStore((state) => state.removeItem);
    const setItems = useAssetStore((state) => state.setItems);
    const setSelectedAssetId = useAssetStore((state) => state.setSelectedAssetId);

    const [urlInput, setUrlInput] = useState('');
    const [feedback, setFeedback] = useState('Phase 1：请选择本地视频或输入直链后开始播放。');
    const [isBuffering, setIsBuffering] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isRegionMode, setIsRegionMode] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [assetMenu, setAssetMenu] = useState<AssetMenuState | null>(null);

    const showToast = (message: string, level: ToastLevel = 'info') => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setToasts((current) => [...current, { id, level, message }]);
        window.setTimeout(() => {
            setToasts((current) => current.filter((item) => item.id !== id));
        }, 3200);
    };

    const dismissToast = (id: number) => {
        setToasts((current) => current.filter((item) => item.id !== id));
    };

    const releaseVideoSource = () => {
        hlsRef.current?.destroy();
        hlsRef.current = null;

        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    };

    const applyVideoSource = (nextSourceUrl: string) => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        releaseVideoSource();

        video.pause();
        video.removeAttribute('src');
        video.load();

        if (isM3u8Source(nextSourceUrl) && Hls.isSupported()) {
            const hls = new Hls();
            hlsRef.current = hls;

            hls.attachMedia(video);
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                hls.loadSource(nextSourceUrl);
                setFeedback('已使用 hls.js 加载 m3u8 流。');
                showToast('已启用 HLS 流播放（m3u8）。', 'info');
            });
            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (!data.fatal) {
                    return;
                }

                const reason = `HLS 致命错误：${data.type}/${data.details}`;
                setFeedback(`播放失败：${reason}`);
                showToast(reason, 'error');
                if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    hls.recoverMediaError();
                } else {
                    hls.destroy();
                    hlsRef.current = null;
                }
            });
        } else {
            video.src = nextSourceUrl;
        }

        setSourceUrl(nextSourceUrl);
        setCurrentTimeMs(0);
        setDurationMs(0);
        setPlaying(false);
        setIsBuffering(false);
        setFeedback('视频已加载，可进行播放与截图。');
        showToast('视频源已加载。', 'success');
    };

    useEffect(() => {
        const init = async () => {
            const result = await noaDesktopClient.listAssets();
            if (result.ok) {
                setItems(result.data.items);
                return;
            }

            showToast(`素材列表加载失败：${result.error.message}`, 'error');
        };

        void init();
    }, [setItems]);

    useEffect(() => {
        return () => {
            releaseVideoSource();
        };
    }, []);

    useEffect(() => {
        const closeMenu = () => setAssetMenu(null);
        const closeByEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setAssetMenu(null);
            }
        };

        window.addEventListener('click', closeMenu);
        window.addEventListener('keydown', closeByEscape);

        return () => {
            window.removeEventListener('click', closeMenu);
            window.removeEventListener('keydown', closeByEscape);
        };
    }, []);

    const regionRect = useMemo<Rect | null>(() => {
        if (!dragStart || !dragCurrent) {
            return null;
        }

        const x = Math.min(dragStart.x, dragCurrent.x);
        const y = Math.min(dragStart.y, dragCurrent.y);
        const width = Math.abs(dragCurrent.x - dragStart.x);
        const height = Math.abs(dragCurrent.y - dragStart.y);

        if (width < 2 || height < 2) {
            return null;
        }

        return { x, y, width, height };
    }, [dragCurrent, dragStart]);

    const togglePlay = async () => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        try {
            if (video.paused) {
                await video.play();
                setPlaying(true);
                return;
            }

            video.pause();
            setPlaying(false);
        } catch {
            setFeedback('播放失败：请检查视频地址或编码格式。');
            showToast('播放启动失败：请检查文件是否损坏或格式是否受支持。', 'error');
        }
    };

    const seekBy = (deltaMs: number) => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        const maxSeconds = Number.isFinite(video.duration) ? Math.max(0, video.duration) : Number.MAX_SAFE_INTEGER;
        const nextSeconds = Math.min(maxSeconds, Math.max(0, video.currentTime + deltaMs / 1000));
        video.currentTime = nextSeconds;
        setCurrentTimeMs(nextSeconds * 1000);
    };

    const seekTo = (nextTimeMs: number) => {
        const video = videoRef.current;
        if (!video || !Number.isFinite(video.duration)) {
            return;
        }

        const maxMs = video.duration * 1000;
        const clampedMs = Math.min(maxMs, Math.max(0, nextTimeMs));
        video.currentTime = clampedMs / 1000;
        setCurrentTimeMs(clampedMs);
    };

    const setPlaybackRate = (nextRate: number) => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        video.playbackRate = nextRate;
        setRate(nextRate);
    };

    const setPlaybackVolume = (nextVolume: number) => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        video.volume = nextVolume;
        setVolume(nextVolume);

        if (nextVolume > 0 && video.muted) {
            video.muted = false;
            setIsMuted(false);
        }
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        const nextMuted = !video.muted;
        video.muted = nextMuted;
        setIsMuted(nextMuted);
    };

    useEffect(() => {
        const handleKeyboardShortcuts = async (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable) {
                return;
            }

            if (event.code === 'Space') {
                event.preventDefault();
                await togglePlay();
                return;
            }

            if (event.code === 'ArrowLeft') {
                event.preventDefault();
                seekBy(-5000);
                return;
            }

            if (event.code === 'ArrowRight') {
                event.preventDefault();
                seekBy(5000);
                return;
            }

            if (event.code.toLowerCase() === 'keym') {
                event.preventDefault();
                toggleMute();
            }
        };

        window.addEventListener('keydown', handleKeyboardShortcuts);
        return () => {
            window.removeEventListener('keydown', handleKeyboardShortcuts);
        };
    }, []);

    const openUrlSource = () => {
        const trimmed = urlInput.trim();
        if (!trimmed) {
            setFeedback('请输入有效的视频 URL。');
            return;
        }

        applyVideoSource(trimmed);
    };

    const openLocalSource = () => {
        fileInputRef.current?.click();
    };

    const onSelectLocalFile = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        applyVideoSource(objectUrl);
        objectUrlRef.current = objectUrl;
        setUrlInput(file.name);
    };

    const saveCapture = async (dataUrl: string, region?: Rect) => {
        const result = await noaDesktopClient.saveCapture({
            dataUrl,
            sourceUrl,
            timestampMs: currentTimeMs,
            region,
        });

        if (!result.ok) {
            setFeedback(`截图保存失败：${result.error.message}`);
            showToast(`截图保存失败：${result.error.message}`, 'error');
            return;
        }

        addItem(result.data.asset);
        setFeedback(`截图保存成功：${result.data.asset.id}`);
        showToast('截图保存成功，图片已自动复制到系统剪贴板。', 'success');
    };

    const openAssetFolder = async () => {
        if (!assetMenu) {
            return;
        }

        const result = await noaDesktopClient.openAssetInFolder({ assetId: assetMenu.assetId });
        if (!result.ok || !result.data.success) {
            showToast('打开所在文件夹失败：素材可能已不存在。', 'error');
            return;
        }

        showToast('已打开素材所在文件夹。', 'info');
    };

    const deleteAsset = async () => {
        if (!assetMenu) {
            return;
        }

        const { assetId } = assetMenu;
        const result = await noaDesktopClient.deleteAsset({ assetId });
        if (!result.ok || !result.data.success) {
            showToast('删除素材失败：素材可能已不存在。', 'error');
            return;
        }

        removeItem(assetId);
        setSelectedAssetId(null);
        setAssetMenu(null);
        showToast('素材已删除。', 'success');
    };

    const captureFullFrame = async () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight) {
            setFeedback('当前视频尚未就绪，无法截图。');
            showToast('截图失败：视频尚未完成解码，稍后重试。', 'error');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext('2d');
        if (!context) {
            setFeedback('浏览器上下文不可用，无法截图。');
            showToast('截图失败：Canvas 上下文不可用。', 'error');
            return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        await saveCapture(dataUrl);
    };

    const startRegionCapture = () => {
        setIsRegionMode(true);
        setDragStart(null);
        setDragCurrent(null);
        setFeedback('区域截图模式：请在视频上拖拽选区。');
        showToast('已进入区域截图模式。', 'info');
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isRegionMode) {
            return;
        }

        const bounds = event.currentTarget.getBoundingClientRect();
        setDragStart({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
        setDragCurrent({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isRegionMode || !dragStart) {
            return;
        }

        const bounds = event.currentTarget.getBoundingClientRect();
        setDragCurrent({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    };

    const onPointerUp = async (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isRegionMode || !dragStart || !regionRect) {
            return;
        }

        const video = videoRef.current;
        if (!video) {
            return;
        }

        const bounds = event.currentTarget.getBoundingClientRect();
        const displayWidth = bounds.width;
        const displayHeight = bounds.height;

        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = Math.max(1, Math.floor(displayWidth));
        frameCanvas.height = Math.max(1, Math.floor(displayHeight));

        const frameContext = frameCanvas.getContext('2d');
        if (!frameContext) {
            setFeedback('浏览器上下文不可用，无法截图。');
            showToast('区域截图失败：Canvas 上下文不可用。', 'error');
            return;
        }

        frameContext.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = Math.max(1, Math.floor(regionRect.width));
        cropCanvas.height = Math.max(1, Math.floor(regionRect.height));
        const cropContext = cropCanvas.getContext('2d');
        if (!cropContext) {
            setFeedback('浏览器上下文不可用，无法截图。');
            showToast('区域截图失败：裁剪上下文不可用。', 'error');
            return;
        }

        cropContext.drawImage(
            frameCanvas,
            regionRect.x,
            regionRect.y,
            regionRect.width,
            regionRect.height,
            0,
            0,
            cropCanvas.width,
            cropCanvas.height,
        );

        const dataUrl = cropCanvas.toDataURL('image/png');
        await saveCapture(dataUrl, regionRect);

        setIsRegionMode(false);
        setDragStart(null);
        setDragCurrent(null);
    };

    const onProgressKeyboardSeek = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') {
            return;
        }

        seekTo(Number(event.currentTarget.value));
    };

    const isSeekable = durationMs > 0;

    return (
        <section className="player-workbench">
            <header className="workbench-header">
                <h1>NoaStudio · Phase 1</h1>
                <p>播放控制 + 全屏截图 + 区域截图 + 素材入库</p>
            </header>

            <div className="workbench-content">
                <section className="player-panel">
                    <div className="source-bar">
                        <input
                            type="text"
                            value={urlInput}
                            onChange={(event) => setUrlInput(event.target.value)}
                            placeholder="输入视频直链（mp4/webm/m3u8）"
                        />
                        <button type="button" onClick={openUrlSource}>打开直链</button>
                        <button type="button" onClick={openLocalSource}>打开本地文件</button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            className="hidden-file-input"
                            onChange={onSelectLocalFile}
                        />
                    </div>

                    <div
                        className={`video-shell ${isRegionMode ? 'region-mode' : ''}`}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                    >
                        <video
                            ref={videoRef}
                            className="player-video"
                            controls={false}
                            onTimeUpdate={(event) => setCurrentTimeMs(event.currentTarget.currentTime * 1000)}
                            onLoadedMetadata={(event) => {
                                const nextDuration = Number.isFinite(event.currentTarget.duration)
                                    ? event.currentTarget.duration * 1000
                                    : 0;
                                setDurationMs(nextDuration);
                            }}
                            onPlay={() => setPlaying(true)}
                            onPause={() => setPlaying(false)}
                            onWaiting={() => setIsBuffering(true)}
                            onPlaying={() => {
                                setIsBuffering(false);
                                setPlaying(true);
                            }}
                            onCanPlay={() => setIsBuffering(false)}
                            onEnded={() => setPlaying(false)}
                            onError={() => {
                                const reason = getMediaErrorMessage(videoRef.current?.error ?? null);
                                setFeedback(`播放失败：${reason}`);
                                showToast(`播放失败：${reason}`, 'error');
                            }}
                        />
                        {regionRect ? (
                            <div
                                className="capture-region"
                                style={{
                                    left: `${regionRect.x}px`,
                                    top: `${regionRect.y}px`,
                                    width: `${regionRect.width}px`,
                                    height: `${regionRect.height}px`,
                                }}
                            />
                        ) : null}
                    </div>

                    <div className="controls-row">
                        <button type="button" onClick={togglePlay}>{isPlaying ? '暂停' : '播放'}</button>
                        <button type="button" onClick={() => seekBy(-5000)}>-5s</button>
                        <button type="button" onClick={() => seekBy(5000)}>+5s</button>
                        <button type="button" onClick={toggleMute}>{isMuted ? '取消静音' : '静音'}</button>
                        <label>
                            倍速
                            <select value={rate} onChange={(event) => setPlaybackRate(Number(event.target.value))}>
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
                                onChange={(event) => setPlaybackVolume(Number(event.target.value))}
                            />
                        </label>
                        <button type="button" onClick={captureFullFrame}>全屏截图</button>
                        <button type="button" onClick={startRegionCapture}>区域截图</button>
                    </div>

                    <div className="progress-row">
                        <input
                            type="range"
                            min={0}
                            max={Math.max(durationMs, 0)}
                            step={100}
                            value={Math.min(currentTimeMs, Math.max(durationMs, 0))}
                            disabled={!isSeekable}
                            onChange={(event) => seekTo(Number(event.target.value))}
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
                </section>

                <section className="asset-list">
                    <h2>素材库（{items.length}）</h2>
                    <div className="asset-grid">
                        {items.map((item) => (
                            <article
                                key={item.id}
                                className="asset-item"
                                onContextMenu={(event) => {
                                    event.preventDefault();
                                    setSelectedAssetId(item.id);
                                    setAssetMenu({
                                        assetId: item.id,
                                        x: event.clientX,
                                        y: event.clientY,
                                    });
                                }}
                            >
                                <img src={item.previewDataUrl} alt={item.id} />
                                <div>{formatTime(item.timestampMs)}</div>
                            </article>
                        ))}
                    </div>
                </section>
            </div>

            {assetMenu ? (
                <div
                    className="asset-menu"
                    style={{ left: `${assetMenu.x}px`, top: `${assetMenu.y}px` }}
                    onClick={(event) => event.stopPropagation()}
                >
                    <button type="button" onClick={openAssetFolder}>打开所在文件夹</button>
                    <button type="button" onClick={deleteAsset}>删除素材</button>
                </div>
            ) : null}

            <div className="toast-container" aria-live="polite" aria-atomic="false">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`toast toast--${toast.level}`} role="status">
                        <span>{toast.message}</span>
                        <button type="button" onClick={() => dismissToast(toast.id)} aria-label="关闭提示">✕</button>
                    </div>
                ))}
            </div>
        </section>
    );
}
