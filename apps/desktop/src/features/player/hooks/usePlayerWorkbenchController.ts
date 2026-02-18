import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { noaDesktopClient } from '../../../ipc';
import { useAssetStore } from '../../../shared/state/asset-store';
import { usePlaybackStore } from '../../../shared/state/playback-store';
import type { AssetSummary } from '../../../shared/ipc/contracts';
import type { AssetMenuState } from '../ui/types';
import { useCaptureAssetActions } from './useCaptureAssetActions';
import { usePlaybackControls } from './usePlaybackControls';
import { usePlayerSourceLoader } from './usePlayerSourceLoader.js';
import { parseSourceInput } from './source-loader/parse-input';
import { useRegionSelection } from './useRegionSelection';
import { useToasts } from './useToasts';
import i18n from '../../../i18n';

export function usePlayerWorkbenchController() {
    const [videoPlaylist, setVideoPlaylist] = useState<Array<{ id: string; label: string; sourceUrl: string; fallbackUrl?: string }>>([]);
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
    const [markdownText, setMarkdownText] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [feedback, setFeedback] = useState(i18n.t('feedback.initial'));
    const [isBuffering, setIsBuffering] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isOcrRunning, setIsOcrRunning] = useState(false);
    const [ocrSummaries, setOcrSummaries] = useState<Record<string, string>>({});
    const [ocrLoadingByAssetId, setOcrLoadingByAssetId] = useState<Record<string, boolean>>({});
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
    const localObjectUrlByVideoIdRef = useRef<Map<string, string>>(new Map());
    const markdownSelectionRef = useRef<{ start: number; end: number } | null>(null);
    const markdownFocusRef = useRef(false);

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

            showToast(i18n.t('feedback.assetListLoadFailed', { message: result.error.message }), 'error');
        };

        void init();
    }, [setItems, showToast]);

    useEffect(() => {
        return () => {
            releaseVideoSource();
            for (const objectUrl of localObjectUrlByVideoIdRef.current.values()) {
                URL.revokeObjectURL(objectUrl);
            }
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

    const switchVideo = (videoId: string) => {
        const target = videoPlaylist.find((item) => item.id === videoId);
        if (!target) {
            return;
        }

        setCurrentVideoId(videoId);
        setUrlInput(target.label);
            void applyVideoSource(target.sourceUrl, target.fallbackUrl);
    };

    const renameVideo = (videoId: string) => {
        const target = videoPlaylist.find((item) => item.id === videoId);
        if (!target) {
            return;
        }

        const nextLabel = window.prompt(i18n.t('playlist.renamePrompt'), target.label)?.trim();
        if (!nextLabel) {
            return;
        }

        setVideoPlaylist((prev) => prev.map((item) => (item.id === videoId ? { ...item, label: nextLabel } : item)));
        if (currentVideoId === videoId) {
            setUrlInput(nextLabel);
        }
        showToast(i18n.t('feedback.renameDone'), 'success');
    };

    const reorderVideo = (draggedId: string, targetId: string) => {
        if (draggedId === targetId) {
            return;
        }

        setVideoPlaylist((prev) => {
            const fromIndex = prev.findIndex((item) => item.id === draggedId);
            const toIndex = prev.findIndex((item) => item.id === targetId);
            if (fromIndex < 0 || toIndex < 0) {
                return prev;
            }

            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });
    };

    const clearCurrentPlayback = () => {
        releaseVideoSource();
        const video = videoRef.current;
        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.load();
        }

        setSourceUrl(null);
        setCurrentTimeMs(0);
        setDurationMs(0);
        setPlaying(false);
        setIsBuffering(false);
    };

    const deleteVideo = (videoId: string) => {
        const currentIndex = videoPlaylist.findIndex((item) => item.id === videoId);
        if (currentIndex < 0) {
            return;
        }

        const localObjectUrl = localObjectUrlByVideoIdRef.current.get(videoId);
        if (localObjectUrl) {
            URL.revokeObjectURL(localObjectUrl);
            localObjectUrlByVideoIdRef.current.delete(videoId);
        }

        const nextPlaylist = videoPlaylist.filter((item) => item.id !== videoId);
        setVideoPlaylist(nextPlaylist);

        if (currentVideoId !== videoId) {
            showToast(i18n.t('feedback.videoDeleted'), 'success');
            return;
        }

        if (nextPlaylist.length === 0) {
            setCurrentVideoId(null);
            setUrlInput('');
            clearCurrentPlayback();
            setFeedback(i18n.t('feedback.playlistEmpty'));
            showToast(i18n.t('feedback.videoDeletedEmpty'), 'info');
            return;
        }

        const fallbackIndex = Math.min(currentIndex, nextPlaylist.length - 1);
        const nextVideo = nextPlaylist[fallbackIndex];
        setCurrentVideoId(nextVideo.id);
        setUrlInput(nextVideo.label);
            void applyVideoSource(nextVideo.sourceUrl, nextVideo.fallbackUrl);
        showToast(i18n.t('feedback.videoDeletedSwitch'), 'success');
    };

    const openUrlSource = () => {
        const trimmed = urlInput.trim();
        if (!trimmed) {
            setFeedback(i18n.t('feedback.invalidUrl'));
            return;
        }

        const parsedInput = parseSourceInput(trimmed);
        const looksLikeJson = trimmed.startsWith('{') && trimmed.endsWith('}') && parsedInput.entries.length > 0;
        const displayLabel = looksLikeJson ? (parsedInput.title ?? i18n.t('playlist.unnamed')) : trimmed;

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setVideoPlaylist((prev) => [
            ...prev,
            {
                id,
                label: displayLabel,
                sourceUrl: trimmed,
            },
        ]);
        setCurrentVideoId(id);
        void applyVideoSource(trimmed);
    };

    const openLocalSource = () => {
        const pickLocalVideos = async () => {
            const result = await noaDesktopClient.pickLocalVideos();
            if (!result.ok) {
                setFeedback(result.error.message);
                showToast(result.error.message, 'error');
                return;
            }

            if (!result.data.items.length) {
                return;
            }

            const nextItems = result.data.items.map((item) => {
                const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                return {
                    id,
                    label: item.name,
                    sourceUrl: toFileUrl(item.path),
                };
            });

            setVideoPlaylist((prev) => [...prev, ...nextItems]);

            const first = nextItems[0];
            setCurrentVideoId(first.id);
            setUrlInput(first.label);
            void applyVideoSource(first.sourceUrl);
        };

        void pickLocalVideos();
    };

    const toFileUrl = (filePath: string) => {
        const normalized = filePath.replace(/\\/g, '/');
        const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
        return `file://${encodeURI(withLeadingSlash)}`;
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

    const summarizeOcrText = (value: string) => {
        const normalized = value.replace(/\s+/g, ' ').trim();
        if (normalized.length <= 80) {
            return normalized;
        }

        return `${normalized.slice(0, 80)}...`;
    };

    const insertMarkdownAtCursorOrTail = (content: string) => {
        const normalized = content.trim();
        if (!normalized) {
            return;
        }

        setMarkdownText((prev) => {
            const selection = markdownSelectionRef.current;
            const canInsertAtCursor = markdownFocusRef.current && selection
                && selection.start >= 0
                && selection.end >= selection.start
                && selection.end <= prev.length;

            if (canInsertAtCursor) {
                const next = `${prev.slice(0, selection.start)}${normalized}${prev.slice(selection.end)}`;
                const nextPos = selection.start + normalized.length;
                markdownSelectionRef.current = { start: nextPos, end: nextPos };
                return next;
            }

            const needsLeadingNewline = prev.length > 0 && !prev.endsWith('\n');
            return `${prev}${needsLeadingNewline ? '\n' : ''}${normalized}`;
        });
    };

    const formatTimestampForNote = (ms: number) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const insertTimestampToken = () => {
        insertMarkdownAtCursorOrTail(`[${formatTimestampForNote(currentTimeMs)}] `);
    };

    const insertAssetImage = (asset: AssetSummary) => {
        const alt = `asset-${asset.id.slice(0, 8)}`;
        insertMarkdownAtCursorOrTail(`![${alt}](${asset.fileUrl})`);
    };

    const setMarkdownSelectionRange = (selection: { start: number; end: number }) => {
        markdownSelectionRef.current = selection;
    };

    const setMarkdownFocus = (focused: boolean) => {
        markdownFocusRef.current = focused;
    };

    const runAssetOcr = async (assetId: string) => {
        if (ocrLoadingByAssetId[assetId]) {
            return;
        }

        setOcrLoadingByAssetId((prev) => ({
            ...prev,
            [assetId]: true,
        }));
        showToast(i18n.t('feedback.ocrProcessing'), 'info');

        try {
            const result = await noaDesktopClient.recognizeAssetOcr({
                assetId,
                language: 'eng+chi_sim',
                copyToClipboard: false,
            });

            if (!result.ok) {
                showToast(i18n.t('feedback.ocrFailed', { message: result.error.message }), 'error');
                return;
            }

            if (!result.data.success) {
                showToast(i18n.t('feedback.ocrFailed', { message: result.data.message }), 'error');
                return;
            }

            const text = result.data.text.trim();
            if (!text) {
                showToast(i18n.t('feedback.ocrEmpty'), 'info');
                return;
            }

            setOcrSummaries((prev) => ({
                ...prev,
                [assetId]: summarizeOcrText(text),
            }));
            insertMarkdownAtCursorOrTail(text);
            showToast(i18n.t('feedback.ocrSummaryReady'), 'success');
        } catch {
            showToast(i18n.t('feedback.ocrBackendError'), 'error');
        } finally {
            setOcrLoadingByAssetId((prev) => {
                const next = { ...prev };
                delete next[assetId];
                return next;
            });
        }
    };

    const isSeekable = durationMs > 0;

    return {
        refs: {
            videoRef,
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
            ocrSummaries,
            ocrLoadingByAssetId,
            videoPlaylist: videoPlaylist.map((item) => ({ id: item.id, label: item.label })),
            currentVideoId,
            isRegionMode: regionActions.isRegionMode,
            regionRect: regionActions.regionRect,
            markdownText,
            urlInput,
            feedback,
        },
        actions: {
            setMarkdownText,
            setMarkdownSelectionRange,
            setMarkdownFocus,
            insertTimestampToken,
            insertAssetImage,
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
            switchVideo,
            renameVideo,
            deleteVideo,
            reorderVideo,
            onAssetContextMenu,
            runAssetOcr,
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
