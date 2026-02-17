import { X } from 'lucide-react';
import type { ToastItem } from './types';

type ToastStackProps = {
    toasts: ToastItem[];
    onDismissToast: (id: number) => void;
};

export function ToastStack({ toasts, onDismissToast }: ToastStackProps) {
    return (
        <div className="toast-container" aria-live="polite" aria-atomic="false">
            {toasts.map((toast) => (
                <div key={toast.id} className={`toast toast--${toast.level} toast--${toast.phase}`} role="status">
                    <span>{toast.message}</span>
                    <button type="button" onClick={() => onDismissToast(toast.id)} aria-label="关闭提示">
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}
