export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type ToastLevel = 'info' | 'success' | 'error';

export type ToastItem = {
    id: number;
    level: ToastLevel;
    message: string;
    phase: 'enter' | 'leave';
};

export type AssetMenuState = {
    assetId: string;
    x: number;
    y: number;
};
