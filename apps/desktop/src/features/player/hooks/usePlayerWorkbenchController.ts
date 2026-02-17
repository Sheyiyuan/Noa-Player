import { useEffect, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { noaDesktopClient } from '../../../ipc';
import { useAssetStore } from '../../../shared/state/asset-store';
import { usePlaybackStore } from '../../../shared/state/playback-store';
import type { AssetMenuState } from '../ui/types';
import { useCaptureAssetActions } from './useCaptureAssetActions';
import { usePlaybackControls } from './usePlaybackControls';
import { usePlayerSourceLoader } from './usePlayerSourceLoader.js';
import { useRegionSelection } from './useRegionSelection';
import { useToasts } from './useToasts';

export function usePlayerWorkbenchController() {
    const [urlInput, setUrlInput] = useState('');
    const [feedback, setFeedback] = useState('Phase 1：请选择本地视频或输入直链后开始播放。');
    const [isBuffering, setIsBuffering] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isOcrRunning, setIsOcrRunning] = useState(false);
    const [assetMenu, setAssetMenu] = useState<AssetMenuState | null>(null);

    const { toasts, showToast, dismissToast } = useToasts();

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

    const videoRef = useState(() => ({ current: null as HTMLVideoElement | null }))[0];
    const fileInputRef = useState(() => ({ current: null as HTMLInputElement | null }))[0];

    const { applyVideoSource, releaseVideoSource, onVideoError } = usePlayerSourceLoader({
        videoRef,
        onFeedback: setFeedback,
        onToast: showToast,
        setSourceUrl,
        setCurrentTimeMs,
        setDurationMs,
        setPlaying,
        setBuffering: setIsBuffering,
    });

    const captureActions = useCaptureAssetActions({
        videoRef,
        sourceUrl,
        currentTimeMs,
        isOcrRunning,
        setIsOcrRunning,
        assetMenu,
        setAssetMenu,
        addItem,
        removeItem,
        setSelectedAssetId,
        onFeedback: setFeedback,
        onToast: showToast,
    });

    const playbackActions = usePlaybackControls({
        videoRef,
        setPlaying,
        setCurrentTimeMs,
        setRate,
        setVolume,
        setMuted: setIsMuted,
        onFeedback: setFeedback,
        onToast: showToast,
    });

    const regionActions = useRegionSelection({
        onFeedback: setFeedback,
        onToast: showToast,
        onCaptureRegion: captureActions.captureRegion,
    });

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
    }, [setItems, showToast]);

    useEffect(() => {
        return () => {
            releaseVideoSource();
        };
    }, [releaseVideoSource]);

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

    const openUrlSource = () => {
        const trimmed = urlInput.trim();
        if (!trimmed) {
            setFeedback('请输入有效的视频 URL。');
            return;
        }

        void applyVideoSource(trimmed);
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
        void applyVideoSource(objectUrl);
        setUrlInput(file.name);
    };

    const onProgressKeyboardSeek = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') {
            return;
        }

        playbackActions.seekTo(Number(event.currentTarget.value));
    };

    const onAssetContextMenu = (payload: { assetId: string; x: number; y: number }) => {
        setSelectedAssetId(payload.assetId);
        setAssetMenu({ assetId: payload.assetId, x: payload.x, y: payload.y });
    };

    const isSeekable = durationMs > 0;

    return {
        refs: {
            videoRef,
            fileInputRef,
        },
        state: {
            items,
            assetMenu,
            toasts,
            sourceUrl,
            currentTimeMs,
            durationMs,
            isPlaying,
            rate,
            volume,
            isBuffering,
            isSeekable,
            isMuted,
            isOcrRunning,
            isRegionMode: regionActions.isRegionMode,
            regionRect: regionActions.regionRect,
            urlInput,
            feedback,
        },
        actions: {
            setUrlInput,
            togglePlay: playbackActions.togglePlay,
            seekBy: playbackActions.seekBy,
            seekTo: playbackActions.seekTo,
            setPlaybackRate: playbackActions.setPlaybackRate,
            setPlaybackVolume: playbackActions.setPlaybackVolume,
            toggleMute: playbackActions.toggleMute,
            captureFullFrame: captureActions.captureFullFrame,
            captureFullFrameWithOcr: captureActions.captureFullFrameWithOcr,
            startRegionCapture: regionActions.startRegionCapture,
            onPointerDown: regionActions.onPointerDown,
            onPointerMove: regionActions.onPointerMove,
            onPointerUp: regionActions.onPointerUp,
            onProgressKeyboardSeek,
            openUrlSource,
            openLocalSource,
            onSelectLocalFile,
            onAssetContextMenu,
            openAssetFolder: captureActions.openAssetFolder,
            deleteAsset: captureActions.deleteAsset,
            dismissToast,
            onVideoError,
            setCurrentTimeMs,
            setDurationMs,
            setPlaying,
            setIsBuffering,
            showToast,
        },
    };
}
