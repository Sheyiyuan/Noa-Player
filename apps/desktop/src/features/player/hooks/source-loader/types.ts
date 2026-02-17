export type SegmentTrack = 'video' | 'audio' | 'auto';

export type SegmentInputEntry = {
    url: string;
    track: SegmentTrack;
    requestHeaders?: Record<string, string>;
};

export type SourceLoaderCallbacks = {
    onFeedback: (message: string) => void;
    onToast: (message: string, level?: 'info' | 'success' | 'error') => void;
};
