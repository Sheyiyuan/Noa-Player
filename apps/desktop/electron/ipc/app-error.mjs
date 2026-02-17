import { ERROR_CODES } from './error-codes.mjs';

export class AppError extends Error {
    constructor({ code, message, details }) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.details = details;
    }
}

export function normalizeUnknownError(error) {
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
