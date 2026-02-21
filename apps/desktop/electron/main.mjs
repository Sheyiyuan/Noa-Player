import { app, BrowserWindow, Menu } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { registerIpcHandlers } from './ipc/register-handlers.mjs';
import { getMediaHeaderOverride } from './ipc/media-header-overrides.mjs';
import { initializeTempNoteProject } from './ipc/note-project.mjs';
import { IPC_CHANNELS } from './ipc/channels.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createMainWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 640,
        frame: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: false,
            allowRunningInsecureContent: true,
        },
    });

    const mediaSession = mainWindow.webContents.session;
    const browserUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

    mediaSession.webRequest.onBeforeSendHeaders({ urls: ['*://*.bilivideo.com/*', '*://*.bilibili.com/*'] }, (details, callback) => {
        const headers = {
            ...details.requestHeaders,
            Referer: 'https://www.bilibili.com/',
            Origin: 'https://www.bilibili.com',
        };

        if (!headers['User-Agent'] && !headers['user-agent']) {
            headers['User-Agent'] = browserUa;
        }

        callback({ requestHeaders: headers });
    });

    mediaSession.webRequest.onBeforeSendHeaders({ urls: ['*://*.googlevideo.com/*', '*://*.youtube.com/*', '*://youtube.com/*', '*://*.ytimg.com/*'] }, (details, callback) => {
        const headers = {
            ...details.requestHeaders,
            Referer: 'https://www.youtube.com/',
            Origin: 'https://www.youtube.com',
        };

        if (!headers['User-Agent'] && !headers['user-agent']) {
            headers['User-Agent'] = browserUa;
        }

        callback({ requestHeaders: headers });
    });

    mediaSession.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
        const overrideHeaders = getMediaHeaderOverride(details.url);
        if (!overrideHeaders) {
            callback({ requestHeaders: details.requestHeaders });
            return;
        }

        callback({
            requestHeaders: {
                ...details.requestHeaders,
                ...overrideHeaders,
            },
        });
    });

    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
        mainWindow.loadURL(devServerUrl);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        const rendererIndexPath = path.join(__dirname, '..', 'dist', 'renderer', 'index.html');
        mainWindow.loadFile(rendererIndexPath);
    }

    const FORCE_CLOSE_FLAG = '__noaAllowClose';
    mainWindow.on('close', (event) => {
        if (mainWindow[FORCE_CLOSE_FLAG]) {
            return;
        }

        event.preventDefault();
        mainWindow.webContents.send(IPC_CHANNELS.WINDOW_CLOSE_INTENT);
    });
}

app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    registerIpcHandlers();
    void initializeTempNoteProject();
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
