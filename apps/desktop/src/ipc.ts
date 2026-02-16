export type IpcSuccess<T> = {
    ok: true;
    data: T;
};

export type IpcFailure = {
    ok: false;
    error: string;
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

export type ExportMarkdownPayload = {
    content: string;
    suggestedName?: string;
};

export type ExportMarkdownResult = {
    filePath: string;
    message: string;
};

export interface NoaDesktopApi {
    ping: () => Promise<IpcResponse<PingResult>>;
    getVersions: () => Promise<IpcResponse<AppVersions>>;
    exportMarkdown: (payload: ExportMarkdownPayload) => Promise<IpcResponse<ExportMarkdownResult>>;
}
