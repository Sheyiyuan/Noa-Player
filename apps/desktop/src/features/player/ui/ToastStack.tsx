import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ToastItem } from './types';

type ToastStackProps = {
    toasts: ToastItem[];
    onDismissToast: (id: number) => void;
};

export function ToastStack({ toasts, onDismissToast }: ToastStackProps) {
    const { t } = useTranslation();

    return (
        <div className="toast-container" aria-live="polite" aria-atomic="false">
            {toasts.map((toast) => (
                <div key={toast.id} className={`toast toast--${toast.level} toast--${toast.phase}`} role="status">
                    <span>{toast.message}</span>
                    <button type="button" onClick={() => onDismissToast(toast.id)} aria-label={t('toast.close')}>
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}
