import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './ipc/channels.mjs';

contextBridge.exposeInMainWorld('noaDesktop', {
    ping: () => ipcRenderer.invoke(IPC_CHANNELS.APP_PING),
    getVersions: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSIONS),
    exportMarkdown: (payload) => ipcRenderer.invoke(IPC_CHANNELS.NOTES_EXPORT_MARKDOWN, payload),
});
