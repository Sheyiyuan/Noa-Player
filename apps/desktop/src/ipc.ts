import type {
    ExportSessionPayload,
    NoaDesktopApi,
} from './shared/ipc/contracts';
import { invokeIpc } from './shared/ipc/response';

export type {
    AssetActionPayload,
    AssetDeleteResult,
    AssetOpenFolderResult,
    AssetSummary,
    AppVersions,
    CaptureRegion,
    ListAssetsResult,
    ExportSessionPayload,
    ExportSessionResult,
    ExportMarkdownPayload,
    ExportMarkdownResult,
    IpcFailure,
    IpcResponse,
    IpcSuccess,
    NoaDesktopApi,
    PingResult,
    SaveCapturePayload,
    SaveCaptureResult,
    WindowCommandResult,
} from './shared/ipc/contracts';

export const noaDesktopClient: NoaDesktopApi = {
    ping: () => invokeIpc(() => window.noaDesktop.ping()),
    getVersions: () => invokeIpc(() => window.noaDesktop.getVersions()),
    minimizeWindow: () => invokeIpc(() => window.noaDesktop.minimizeWindow()),
    toggleMaximizeWindow: () => invokeIpc(() => window.noaDesktop.toggleMaximizeWindow()),
    closeWindow: () => invokeIpc(() => window.noaDesktop.closeWindow()),
    saveCapture: (payload) => invokeIpc(() => window.noaDesktop.saveCapture(payload)),
    listAssets: () => invokeIpc(() => window.noaDesktop.listAssets()),
    openAssetInFolder: (payload) => invokeIpc(() => window.noaDesktop.openAssetInFolder(payload)),
    deleteAsset: (payload) => invokeIpc(() => window.noaDesktop.deleteAsset(payload)),
    exportSession: (payload: ExportSessionPayload) => invokeIpc(() => window.noaDesktop.exportSession(payload)),
    exportMarkdown: (payload: ExportSessionPayload) => invokeIpc(() => window.noaDesktop.exportMarkdown(payload)),
};
