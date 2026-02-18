import { noaDesktopClient } from '../../../../ipc';
import i18n from '../../../../i18n';

type Params = {
    isOcrRunning: boolean;
    setIsOcrRunning: (value: boolean) => void;
    captureFullFrame: () => Promise<{ id: string } | null>;
    onFeedback: (message: string) => void;
    onToast: (message: string, level?: 'info' | 'success' | 'error') => void;
};

export function useOcrActions({
    isOcrRunning,
    setIsOcrRunning,
    captureFullFrame,
    onFeedback,
    onToast,
}: Params) {
    const captureFullFrameWithOcr = async () => {
        if (isOcrRunning) {
            return;
        }

        setIsOcrRunning(true);
        onFeedback(i18n.t('feedback.ocrProcessing'));
        onToast(i18n.t('feedback.ocrProcessing'), 'info');

        try {
            const asset = await captureFullFrame();
            if (!asset) {
                return;
            }

            const result = await noaDesktopClient.recognizeAssetOcr({
                assetId: asset.id,
                language: 'eng+chi_sim',
                copyToClipboard: true,
            });

            if (!result.ok) {
                onFeedback(i18n.t('feedback.ocrFailed', { message: result.error.message }));
                onToast(i18n.t('feedback.ocrFailed', { message: result.error.message }), 'error');
                return;
            }

            if (!result.data.success) {
                onFeedback(i18n.t('feedback.ocrFailed', { message: result.data.message }));
                onToast(i18n.t('feedback.ocrFailed', { message: result.data.message }), 'error');
                return;
            }

            const text = result.data.text.trim();
            if (!text) {
                onFeedback(result.data.message);
                onToast(i18n.t('feedback.ocrEmpty'), 'info');
                return;
            }

            onFeedback(i18n.t('feedback.ocrSummaryReady'));
            onToast(i18n.t('feedback.ocrSummaryReady'), 'success');
        } catch {
            onFeedback(i18n.t('feedback.ocrBackendError'));
            onToast(i18n.t('feedback.ocrBackendError'), 'error');
        } finally {
            setIsOcrRunning(false);
        }
    };

    return {
        captureFullFrameWithOcr,
    };
}
