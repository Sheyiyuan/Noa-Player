import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './ipc/channels.mjs';

contextBridge.exposeInMainWorld('noaDesktop', {
    ping: () => ipcRenderer.invoke(IPC_CHANNELS.APP_PING),
    getVersions: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSIONS),
    minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    toggleMaximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE),
    closeWindow: (payload) => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE, payload),
    saveCapture: (payload) => ipcRenderer.invoke(IPC_CHANNELS.ASSET_SAVE_CAPTURE, payload),
    listAssets: () => ipcRenderer.invoke(IPC_CHANNELS.ASSET_LIST),
    openAssetInFolder: (payload) => ipcRenderer.invoke(IPC_CHANNELS.ASSET_OPEN_IN_FOLDER, payload),
    deleteAsset: (payload) => ipcRenderer.invoke(IPC_CHANNELS.ASSET_DELETE, payload),
    recognizeAssetOcr: (payload) => ipcRenderer.invoke(IPC_CHANNELS.OCR_RECOGNIZE_ASSET, payload),
    pickLocalVideos: () => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_PICK_LOCAL_VIDEOS),
    registerMediaHeaders: (payload) => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_REGISTER_HEADERS, payload),
    getTempNoteProject: () => ipcRenderer.invoke(IPC_CHANNELS.NOTES_GET_TEMP_PROJECT),
    saveTempNoteProject: (payload) => ipcRenderer.invoke(IPC_CHANNELS.NOTES_SAVE_TEMP_PROJECT, payload),
    setNoteDirty: (payload) => ipcRenderer.invoke(IPC_CHANNELS.NOTES_SET_DIRTY, payload),
    setProjectVideos: (payload) => ipcRenderer.invoke(IPC_CHANNELS.NOTES_SET_PROJECT_VIDEOS, payload),
    saveProjectAs: (payload) => ipcRenderer.invoke(IPC_CHANNELS.NOTES_SAVE_PROJECT_AS, payload),
    listSaveDirectories: (payload) => ipcRenderer.invoke(IPC_CHANNELS.NOTES_LIST_SAVE_DIRECTORIES, payload),
    createSaveDirectory: (payload) => ipcRenderer.invoke(IPC_CHANNELS.NOTES_CREATE_SAVE_DIRECTORY, payload),
    exportSession: (payload) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_SESSION, payload),
    exportMarkdown: (payload) => ipcRenderer.invoke(IPC_CHANNELS.NOTES_EXPORT_MARKDOWN, payload),
});

ipcRenderer.on(IPC_CHANNELS.WINDOW_CLOSE_INTENT, () => {
    window.dispatchEvent(new CustomEvent('noa-window-close-intent'));
});
