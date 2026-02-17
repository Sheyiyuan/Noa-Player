import { describe, expect, it } from 'vitest';
import { AppError } from '../src/shared/errors/app-error';
import { ERROR_CODES } from '../src/shared/errors/error-codes';
import { createIpcFailure, createIpcSuccess } from '../src/shared/ipc/response';

describe('ipc response helpers', () => {
    it('creates success payload', () => {
        const result = createIpcSuccess({ value: 1 });

        expect(result).toEqual({
            ok: true,
            data: { value: 1 },
        });
    });

    it('creates failure payload from AppError', () => {
        const result = createIpcFailure(
            new AppError({
                code: ERROR_CODES.IPC_INVALID_PAYLOAD,
                message: 'payload 必须是对象',
            }),
        );

        expect(result.ok).toBe(false);
        if (result.ok) {
            return;
        }

        expect(result.error.code).toBe(ERROR_CODES.IPC_INVALID_PAYLOAD);
        expect(result.error.message).toBe('payload 必须是对象');
    });
});
