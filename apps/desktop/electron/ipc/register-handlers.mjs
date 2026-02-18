import { dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import { IPC_CHANNELS } from './channels.mjs';
import { wrapIpcHandler } from './ipc-response.mjs';
import {
    validateAssetActionPayload,
    validateExportSessionPayload,
    validateRegisterMediaHeadersPayload,
    validateRecognizeAssetOcrPayload,
    validateSaveCapturePayload,
} from './validators.mjs';
import {
    deleteCaptureAsset,
    getCaptureAssetById,
    listCaptureAssets,
    openCaptureAssetInFolder,
    saveCaptureAsset,
} from './asset-repository.mjs';
import { recognizeAssetText } from './ocr-service.mjs';
import { registerMediaHeaderOverrides } from './media-header-overrides.mjs';

function registerChannel(channel, config) {
    ipcMain.handle(channel, wrapIpcHandler(config));
}

function getSenderWindow(event) {
    return event?.sender ? event.sender.getOwnerBrowserWindow() : null;
}

export function registerIpcHandlers() {
    registerChannel(IPC_CHANNELS.APP_PING, {
        handle: async () => ({
            message: 'pong',
            timestamp: new Date().toISOString(),
        }),
    });

    registerChannel(IPC_CHANNELS.APP_GET_VERSIONS, {
        handle: async () => ({
            electron: process.versions.electron,
            chrome: process.versions.chrome,
            node: process.versions.node,
        }),
    });

    registerChannel(IPC_CHANNELS.WINDOW_MINIMIZE, {
        handle: async (_payload, event) => {
            getSenderWindow(event)?.minimize();
            return { success: true };
        },
    });

    registerChannel(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE, {
        handle: async (_payload, event) => {
            const window = getSenderWindow(event);
            if (!window) {
                return { success: false, isMaximized: false };
            }

            if (window.isMaximized()) {
                window.unmaximize();
            } else {
                window.maximize();
            }

            return { success: true, isMaximized: window.isMaximized() };
        },
    });

    registerChannel(IPC_CHANNELS.WINDOW_CLOSE, {
        handle: async (_payload, event) => {
            getSenderWindow(event)?.close();
            return { success: true };
        },
    });

    registerChannel(IPC_CHANNELS.ASSET_SAVE_CAPTURE, {
        validate: validateSaveCapturePayload,
        handle: async (payload) => saveCaptureAsset(payload),
    });

    registerChannel(IPC_CHANNELS.ASSET_LIST, {
        handle: async () => listCaptureAssets(),
    });

    registerChannel(IPC_CHANNELS.ASSET_OPEN_IN_FOLDER, {
        validate: validateAssetActionPayload,
        handle: async (payload) => {
            const result = await openCaptureAssetInFolder(payload.assetId);
            if (result.success && result.imagePath) {
                shell.showItemInFolder(result.imagePath);
            }

            return { success: result.success };
        },
    });

    registerChannel(IPC_CHANNELS.ASSET_DELETE, {
        validate: validateAssetActionPayload,
        handle: async (payload) => deleteCaptureAsset(payload.assetId),
    });

    registerChannel(IPC_CHANNELS.OCR_RECOGNIZE_ASSET, {
        validate: validateRecognizeAssetOcrPayload,
        handle: async (payload) => {
            const asset = await getCaptureAssetById(payload.assetId);
            if (!asset) {
                return {
                    success: false,
                    text: '',
                    usedLanguage: payload.language,
                    copied: false,
                    message: '素材不存在或已被删除',
                };
            }

            const result = await recognizeAssetText({
                imagePath: asset.imagePath,
                preferredLanguage: payload.language,
                copyToClipboard: payload.copyToClipboard,
            });

            return {
                success: true,
                text: result.text,
                usedLanguage: result.usedLanguage,
                copied: result.copied,
                message: result.text ? 'OCR 完成' : 'OCR 完成，但未识别到有效文本',
            };
        },
    });

    registerChannel(IPC_CHANNELS.MEDIA_REGISTER_HEADERS, {
        validate: validateRegisterMediaHeadersPayload,
        handle: async (payload) => ({
            registeredCount: registerMediaHeaderOverrides(payload.items),
        }),
    });

    registerChannel(IPC_CHANNELS.MEDIA_PICK_LOCAL_VIDEOS, {
        handle: async (_payload, event) => {
            const window = getSenderWindow(event);
            const result = await dialog.showOpenDialog(window ?? undefined, {
                properties: ['openFile', 'multiSelections'],
                filters: [
                    { name: 'Videos', extensions: ['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'wmv', 'flv', 'm2ts', 'ts'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
            });

            if (result.canceled || !result.filePaths.length) {
                return { items: [] };
            }

            return {
                items: result.filePaths.map((filePath) => ({
                    path: filePath,
                    name: path.basename(filePath),
                })),
            };
        },
    });

    const exportSessionConfig = {
        validate: validateExportSessionPayload,
        handle: async () => ({
            filePath: '',
            message: 'exportSession IPC 骨架已接通，导出逻辑待实现。',
        }),
    };

    registerChannel(IPC_CHANNELS.EXPORT_SESSION, exportSessionConfig);
    registerChannel(IPC_CHANNELS.NOTES_EXPORT_MARKDOWN, exportSessionConfig);
}
