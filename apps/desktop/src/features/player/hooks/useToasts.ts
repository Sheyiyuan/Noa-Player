import { useCallback, useState } from 'react';
import type { ToastItem, ToastLevel } from '../ui/types';

export function useToasts() {
    const TOAST_VISIBLE_MS = 2800;
    const TOAST_LEAVE_MS = 220;
    const MAX_TOASTS = 6;

    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, level: ToastLevel = 'info') => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setToasts((current) => {
            const last = current[current.length - 1];
            if (last && last.message === message && last.level === level && last.phase !== 'leave') {
                return current;
            }

            const next = [...current, { id, level, message, phase: 'enter' }];
            if (next.length <= MAX_TOASTS) {
                return next;
            }

            return next.slice(next.length - MAX_TOASTS);
        });

        window.setTimeout(() => {
            setToasts((current) => current.map((item) => (item.id === id ? { ...item, phase: 'leave' } : item)));
        }, TOAST_VISIBLE_MS);

        window.setTimeout(() => {
            setToasts((current) => current.filter((item) => item.id !== id));
        }, TOAST_VISIBLE_MS + TOAST_LEAVE_MS);
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts((current) => current.map((item) => (item.id === id ? { ...item, phase: 'leave' } : item)));

        window.setTimeout(() => {
            setToasts((current) => current.filter((item) => item.id !== id));
        }, TOAST_LEAVE_MS);
    }, []);

    return {
        toasts,
        showToast,
        dismissToast,
    };
}
