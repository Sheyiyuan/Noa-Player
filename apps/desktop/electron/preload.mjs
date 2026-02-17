import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './ipc/channels.mjs';

contextBridge.exposeInMainWorld('noaDesktop', {
    ping: () => ipcRenderer.invoke(IPC_CHANNELS.APP_PING),
    getVersions: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSIONS),
    minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    toggleMaximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE),
    closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
    saveCapture: (payload) => ipcRenderer.invoke(IPC_CHANNELS.ASSET_SAVE_CAPTURE, payload),
    listAssets: () => ipcRenderer.invoke(IPC_CHANNELS.ASSET_LIST),
    openAssetInFolder: (payload) => ipcRenderer.invoke(IPC_CHANNELS.ASSET_OPEN_IN_FOLDER, payload),
    deleteAsset: (payload) => ipcRenderer.invoke(IPC_CHANNELS.ASSET_DELETE, payload),
    recognizeAssetOcr: (payload) => ipcRenderer.invoke(IPC_CHANNELS.OCR_RECOGNIZE_ASSET, payload),
    registerMediaHeaders: (payload) => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_REGISTER_HEADERS, payload),
    exportSession: (payload) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_SESSION, payload),
    exportMarkdown: (payload) => ipcRenderer.invoke(IPC_CHANNELS.NOTES_EXPORT_MARKDOWN, payload),
});
