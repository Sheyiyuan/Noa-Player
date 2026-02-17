import { AppError, normalizeUnknownError } from './app-error.mjs';
import { ERROR_CODES } from './error-codes.mjs';

export function createIpcSuccess(data) {
    return {
        ok: true,
        data,
    };
}

export function createIpcFailure(error) {
    const appError = normalizeUnknownError(error);
    return {
        ok: false,
        error: {
            code: appError.code,
            message: appError.message,
            details: appError.details,
        },
    };
}

export function wrapIpcHandler({ validate, handle }) {
    return async (event, payload) => {
        try {
            const validatedPayload = typeof validate === 'function' ? validate(payload) : payload;
            const data = await handle(validatedPayload, event);
            return createIpcSuccess(data);
        } catch (error) {
            return createIpcFailure(
                error instanceof AppError
                    ? error
                    : new AppError({
                        code: ERROR_CODES.IPC_HANDLER_FAILED,
                        message: 'IPC 处理失败',
                        details: error,
                    }),
            );
        }
    };
}
