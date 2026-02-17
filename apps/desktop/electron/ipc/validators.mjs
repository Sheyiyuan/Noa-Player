import { AppError } from './app-error.mjs';
import { ERROR_CODES } from './error-codes.mjs';

export function validateSaveCapturePayload(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new AppError({
            code: ERROR_CODES.IPC_INVALID_PAYLOAD,
            message: 'payload 必须是对象',
        });
    }

    if (typeof payload.dataUrl !== 'string' || !payload.dataUrl.startsWith('data:image/')) {
        throw new AppError({
            code: ERROR_CODES.CAPTURE_INVALID_IMAGE,
            message: 'dataUrl 必须是 data:image/* 格式',
        });
    }

    if (payload.sourceUrl !== null && typeof payload.sourceUrl !== 'string') {
        throw new AppError({
            code: ERROR_CODES.IPC_INVALID_PAYLOAD,
            message: 'sourceUrl 必须是字符串或 null',
        });
    }

    if (typeof payload.timestampMs !== 'number' || Number.isNaN(payload.timestampMs) || payload.timestampMs < 0) {
        throw new AppError({
            code: ERROR_CODES.IPC_INVALID_PAYLOAD,
            message: 'timestampMs 必须是非负数字',
        });
    }

    if (typeof payload.region !== 'undefined') {
        const region = payload.region;
        const regionValues = [region?.x, region?.y, region?.width, region?.height];
        const validRegion = region && regionValues.every((value) => typeof value === 'number' && Number.isFinite(value));

        if (!validRegion || region.width <= 0 || region.height <= 0) {
            throw new AppError({
                code: ERROR_CODES.IPC_INVALID_PAYLOAD,
                message: 'region 坐标必须为有效数字且宽高大于 0',
            });
        }
    }

    return {
        dataUrl: payload.dataUrl,
        sourceUrl: payload.sourceUrl,
        timestampMs: payload.timestampMs,
        region: payload.region,
    };
}

export function validateAssetActionPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new AppError({
            code: ERROR_CODES.IPC_INVALID_PAYLOAD,
            message: 'payload 必须是对象',
        });
    }

    const assetId = typeof payload.assetId === 'string' ? payload.assetId.trim() : '';
    if (!assetId) {
        throw new AppError({
            code: ERROR_CODES.IPC_INVALID_PAYLOAD,
            message: 'assetId 不能为空',
        });
    }

    return { assetId };
}

export function validateExportSessionPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new AppError({
            code: ERROR_CODES.IPC_INVALID_PAYLOAD,
            message: 'payload 必须是对象',
        });
    }

    const content = typeof payload.content === 'string' ? payload.content.trim() : '';
    if (!content) {
        throw new AppError({
            code: ERROR_CODES.EXPORT_INVALID_CONTENT,
            message: 'content 不能为空',
        });
    }

    const hasSuggestedName = Object.prototype.hasOwnProperty.call(payload, 'suggestedName');
    if (hasSuggestedName && typeof payload.suggestedName !== 'string') {
        throw new AppError({
            code: ERROR_CODES.IPC_INVALID_PAYLOAD,
            message: 'suggestedName 必须是字符串',
        });
    }

    return {
        content,
        suggestedName: payload.suggestedName,
    };
}

export const validateExportMarkdownPayload = validateExportSessionPayload;

export function validateRegisterMediaHeadersPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new AppError({
            code: ERROR_CODES.IPC_INVALID_PAYLOAD,
            message: 'payload 必须是对象',
        });
    }

    const items = Array.isArray(payload.items) ? payload.items : [];
    const normalizedItems = items
        .map((item) => {
            const url = typeof item?.url === 'string' ? item.url.trim() : '';
            const headers = item?.headers && typeof item.headers === 'object' && !Array.isArray(item.headers)
                ? Object.fromEntries(
                    Object.entries(item.headers).filter(([key, value]) => {
                        return typeof key === 'string' && key.length > 0 && typeof value === 'string' && value.length > 0;
                    }),
                )
                : {};

            return {
                url,
                headers,
            };
        })
        .filter((item) => item.url.length > 0 && Object.keys(item.headers).length > 0);

    return { items: normalizedItems };
}

export function validateRecognizeAssetOcrPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new AppError({
            code: ERROR_CODES.IPC_INVALID_PAYLOAD,
            message: 'payload 必须是对象',
        });
    }

    const assetId = typeof payload.assetId === 'string' ? payload.assetId.trim() : '';
    if (!assetId) {
        throw new AppError({
            code: ERROR_CODES.IPC_INVALID_PAYLOAD,
            message: 'assetId 不能为空',
        });
    }

    const language = typeof payload.language === 'string' ? payload.language.trim() : 'eng+chi_sim';
    if (language !== 'eng+chi_sim' && language !== 'eng') {
        throw new AppError({
            code: ERROR_CODES.IPC_INVALID_PAYLOAD,
            message: 'language 仅支持 eng+chi_sim 或 eng',
        });
    }

    const copyToClipboard = typeof payload.copyToClipboard === 'boolean' ? payload.copyToClipboard : true;

    return {
        assetId,
        language,
        copyToClipboard,
    };
}
