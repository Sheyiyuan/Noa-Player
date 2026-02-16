import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels.mjs';

function ok(data) {
    return { ok: true, data };
}

function fail(message) {
    return { ok: false, error: message };
}

export function registerIpcHandlers() {
    ipcMain.handle(IPC_CHANNELS.APP_PING, async () => {
        return ok({
            message: 'pong',
            timestamp: new Date().toISOString(),
        });
    });

    ipcMain.handle(IPC_CHANNELS.APP_GET_VERSIONS, async () => {
        return ok({
            electron: process.versions.electron,
            chrome: process.versions.chrome,
            node: process.versions.node,
        });
    });

    ipcMain.handle(IPC_CHANNELS.NOTES_EXPORT_MARKDOWN, async (_event, payload) => {
        if (!payload || !payload.content) {
            return fail('content 不能为空');
        }

        return ok({
            filePath: '',
            message: 'exportMarkdown IPC 骨架已接通，导出逻辑待实现。',
        });
    });
}
