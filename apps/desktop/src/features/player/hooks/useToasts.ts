import { useState } from 'react';
import type { ToastItem, ToastLevel } from '../ui/types';

export function useToasts() {
    const TOAST_VISIBLE_MS = 2800;
    const TOAST_LEAVE_MS = 220;

    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = (message: string, level: ToastLevel = 'info') => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setToasts((current) => [...current, { id, level, message, phase: 'enter' }]);

        window.setTimeout(() => {
            setToasts((current) => current.map((item) => (item.id === id ? { ...item, phase: 'leave' } : item)));
        }, TOAST_VISIBLE_MS);

        window.setTimeout(() => {
            setToasts((current) => current.filter((item) => item.id !== id));
        }, TOAST_VISIBLE_MS + TOAST_LEAVE_MS);
    };

    const dismissToast = (id: number) => {
        setToasts((current) => current.map((item) => (item.id === id ? { ...item, phase: 'leave' } : item)));

        window.setTimeout(() => {
            setToasts((current) => current.filter((item) => item.id !== id));
        }, TOAST_LEAVE_MS);
    };

    return {
        toasts,
        showToast,
        dismissToast,
    };
}
