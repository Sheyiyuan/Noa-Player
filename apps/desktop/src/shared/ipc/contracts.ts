import type { AppErrorPayload } from '../errors/app-error';

export type IpcSuccess<T> = {
    ok: true;
    data: T;
};

export type IpcFailure = {
    ok: false;
    error: AppErrorPayload;
};

export type IpcResponse<T> = IpcSuccess<T> | IpcFailure;

export type AppVersions = {
    electron: string;
    chrome: string;
    node: string;
};

export type PingResult = {
    message: string;
    timestamp: string;
};

export type WindowCommandResult = {
    success: boolean;
    isMaximized?: boolean;
};

export type CaptureRegion = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type SaveCapturePayload = {
    dataUrl: string;
    sourceUrl: string | null;
    timestampMs: number;
    region?: CaptureRegion;
};

export type AssetSummary = {
    id: string;
    imagePath: string;
    fileUrl: string;
    previewDataUrl: string;
    mimeType: string;
    sourceUrl: string | null;
    timestampMs: number;
    width: number;
    height: number;
    createdAt: string;
};

export type SaveCaptureResult = {
    asset: AssetSummary;
};

export type ListAssetsResult = {
    items: AssetSummary[];
};

export type AssetActionPayload = {
    assetId: string;
};

export type AssetOpenFolderResult = {
    success: boolean;
};

export type AssetDeleteResult = {
    success: boolean;
    assetId: string;
};

export type ExportSessionPayload = {
    content: string;
    suggestedName?: string;
};

export type ExportSessionResult = {
    filePath: string;
    message: string;
};

export type ExportMarkdownPayload = ExportSessionPayload;
export type ExportMarkdownResult = ExportSessionResult;

export interface NoaDesktopApi {
    ping: () => Promise<IpcResponse<PingResult>>;
    getVersions: () => Promise<IpcResponse<AppVersions>>;
    minimizeWindow: () => Promise<IpcResponse<WindowCommandResult>>;
    toggleMaximizeWindow: () => Promise<IpcResponse<WindowCommandResult>>;
    closeWindow: () => Promise<IpcResponse<WindowCommandResult>>;
    saveCapture: (payload: SaveCapturePayload) => Promise<IpcResponse<SaveCaptureResult>>;
    listAssets: () => Promise<IpcResponse<ListAssetsResult>>;
    openAssetInFolder: (payload: AssetActionPayload) => Promise<IpcResponse<AssetOpenFolderResult>>;
    deleteAsset: (payload: AssetActionPayload) => Promise<IpcResponse<AssetDeleteResult>>;
    exportSession: (payload: ExportSessionPayload) => Promise<IpcResponse<ExportSessionResult>>;
    exportMarkdown: (payload: ExportMarkdownPayload) => Promise<IpcResponse<ExportMarkdownResult>>;
}
