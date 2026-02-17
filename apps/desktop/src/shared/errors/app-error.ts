import type { ErrorCode } from './error-codes';
import { ERROR_CODES } from './error-codes';

export type AppErrorPayload = {
    code: ErrorCode;
    message: string;
    details?: unknown;
};

export class AppError extends Error {
    readonly code: ErrorCode;
    readonly details?: unknown;

    constructor(payload: AppErrorPayload) {
        super(payload.message);
        this.name = 'AppError';
        this.code = payload.code;
        this.details = payload.details;
    }
}

export function normalizeUnknownError(error: unknown): AppError {
    if (error instanceof AppError) {
        return error;
    }

    if (error instanceof Error) {
        return new AppError({
            code: ERROR_CODES.UNKNOWN_ERROR,
            message: error.message,
        });
    }

    return new AppError({
        code: ERROR_CODES.UNKNOWN_ERROR,
        message: '发生未知错误',
        details: error,
    });
}
