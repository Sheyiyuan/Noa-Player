import { useEffect, type RefObject } from 'react';

type Params = {
    videoRef: RefObject<HTMLVideoElement | null>;
    setPlaying: (value: boolean) => void;
    setCurrentTimeMs: (value: number) => void;
    setRate: (value: number) => void;
    setVolume: (value: number) => void;
    setMuted: (value: boolean) => void;
    onFeedback: (message: string) => void;
    onToast: (message: string, level?: 'info' | 'success' | 'error') => void;
};

export function usePlaybackControls({
    videoRef,
    setPlaying,
    setCurrentTimeMs,
    setRate,
    setVolume,
    setMuted,
    onFeedback,
    onToast,
}: Params) {
    const getSeekableEndSeconds = (video: HTMLVideoElement): number => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
            return video.duration;
        }

        if (video.seekable.length > 0) {
            const seekableEnd = video.seekable.end(video.seekable.length - 1);
            if (Number.isFinite(seekableEnd) && seekableEnd > 0) {
                return seekableEnd;
            }
        }

        if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            if (Number.isFinite(bufferedEnd) && bufferedEnd > 0) {
                return bufferedEnd;
            }
        }

        return 0;
    };

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
            onFeedback('播放失败：请检查视频地址或编码格式。');
            onToast('播放启动失败：请检查文件是否损坏或格式是否受支持。', 'error');
        }
    };

    const seekBy = (deltaMs: number) => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        const seekableEndSeconds = getSeekableEndSeconds(video);
        const maxSeconds = seekableEndSeconds > 0 ? seekableEndSeconds : Number.MAX_SAFE_INTEGER;
        const nextSeconds = Math.min(maxSeconds, Math.max(0, video.currentTime + deltaMs / 1000));
        video.currentTime = nextSeconds;
        setCurrentTimeMs(nextSeconds * 1000);
    };

    const seekTo = (nextTimeMs: number) => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        const seekableEndSeconds = getSeekableEndSeconds(video);
        if (!(seekableEndSeconds > 0)) {
            return;
        }

        const maxMs = seekableEndSeconds * 1000;
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
            setMuted(false);
        }
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        const nextMuted = !video.muted;
        video.muted = nextMuted;
        setMuted(nextMuted);
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
    });

    return {
        togglePlay,
        seekBy,
        seekTo,
        setPlaybackRate,
        setPlaybackVolume,
        toggleMute,
    };
}
