import { create } from 'zustand';

type PlaybackState = {
    sourceUrl: string | null;
    durationMs: number;
    isPlaying: boolean;
    currentTimeMs: number;
    rate: number;
    volume: number;
    setSourceUrl: (sourceUrl: string | null) => void;
    setDurationMs: (durationMs: number) => void;
    setPlaying: (isPlaying: boolean) => void;
    setCurrentTimeMs: (currentTimeMs: number) => void;
    setRate: (rate: number) => void;
    setVolume: (volume: number) => void;
};

export const usePlaybackStore = create<PlaybackState>((set) => ({
    sourceUrl: null,
    durationMs: 0,
    isPlaying: false,
    currentTimeMs: 0,
    rate: 1,
    volume: 1,
    setSourceUrl: (sourceUrl) => set({ sourceUrl }),
    setDurationMs: (durationMs) => set({ durationMs }),
    setPlaying: (isPlaying) => set({ isPlaying }),
    setCurrentTimeMs: (currentTimeMs) => set({ currentTimeMs }),
    setRate: (rate) => set({ rate }),
    setVolume: (volume) => set({ volume }),
}));
