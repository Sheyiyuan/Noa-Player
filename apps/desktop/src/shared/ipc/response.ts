import { AppError, normalizeUnknownError } from '../errors/app-error';
import { ERROR_CODES } from '../errors/error-codes';
import type { IpcFailure, IpcResponse, IpcSuccess } from './contracts';

export function createIpcSuccess<T>(data: T): IpcSuccess<T> {
    return {
        ok: true,
        data,
    };
}

export function createIpcFailure(error: unknown): IpcFailure {
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

export async function invokeIpc<T>(operation: () => Promise<IpcResponse<T>>): Promise<IpcResponse<T>> {
    try {
        return await operation();
    } catch (error) {
        return createIpcFailure(
            error instanceof AppError
                ? error
                : new AppError({
                    code: ERROR_CODES.IPC_HANDLER_FAILED,
                    message: 'IPC 调用失败',
                    details: error,
                }),
        );
    }
}
