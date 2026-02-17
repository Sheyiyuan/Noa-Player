import type {
    ExportSessionPayload,
    NoaDesktopApi,
    RecognizeAssetOcrPayload,
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
    RecognizeAssetOcrPayload,
    RecognizeAssetOcrResult,
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
    recognizeAssetOcr: (payload: RecognizeAssetOcrPayload) => invokeIpc(() => {
        const method = (window.noaDesktop as NoaDesktopApi & { recognizeAssetOcr?: NoaDesktopApi['recognizeAssetOcr'] }).recognizeAssetOcr;
        if (typeof method !== 'function') {
            throw new Error('后端 OCR IPC 未就绪，请重启应用后重试');
        }

        return method(payload);
    }),
    registerMediaHeaders: (payload) => invokeIpc(() => window.noaDesktop.registerMediaHeaders(payload)),
    exportSession: (payload: ExportSessionPayload) => invokeIpc(() => window.noaDesktop.exportSession(payload)),
    exportMarkdown: (payload: ExportSessionPayload) => invokeIpc(() => window.noaDesktop.exportMarkdown(payload)),
};
