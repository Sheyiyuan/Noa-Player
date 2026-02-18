import { noaDesktopClient } from '../../../../ipc';
import i18n from '../../../../i18n';
import { usePreferencesStore } from '../../../../shared/state/preferences-store';
import type { Rect } from '../../ui/types';

type Params = {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    sourceUrl: string | null;
    currentTimeMs: number;
    addItem: (item: any) => void;
    onFeedback: (message: string) => void;
    onToast: (message: string, level?: 'info' | 'success' | 'error') => void;
};

export function useCaptureSaver({
    videoRef,
    sourceUrl,
    currentTimeMs,
    addItem,
    onFeedback,
    onToast,
}: Params) {
    const copyCaptureToClipboard = usePreferencesStore((state) => state.copyCaptureToClipboard);

    const saveCapture = async (dataUrl: string, region?: Rect) => {
        const result = await noaDesktopClient.saveCapture({
            dataUrl,
            sourceUrl,
            timestampMs: currentTimeMs,
            region,
            copyToClipboard: copyCaptureToClipboard,
        });

        if (!result.ok) {
            onFeedback(i18n.t('feedback.captureSaveFailed', { message: result.error.message }));
            onToast(i18n.t('feedback.captureSaveFailed', { message: result.error.message }), 'error');
            return null;
        }

        addItem(result.data.asset);
        onFeedback(`${i18n.t('controls.capture')}：${result.data.asset.id}`);
        onToast(copyCaptureToClipboard ? i18n.t('feedback.captureSaved') : i18n.t('feedback.captureSavedNoClipboard'), 'success');
        return result.data.asset;
    };

    const captureFullFrame = async () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight) {
            onFeedback(i18n.t('feedback.videoNotReady'));
            onToast(i18n.t('feedback.videoNotReadyToast'), 'error');
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext('2d');
        if (!context) {
            onFeedback(i18n.t('feedback.canvasUnavailable'));
            onToast(i18n.t('feedback.canvasUnavailableToast'), 'error');
            return null;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        return saveCapture(dataUrl);
    };

    const captureRegion = async (regionRect: Rect, bounds: DOMRect) => {
        const video = videoRef.current;
        if (!video) {
            return false;
        }

        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = Math.max(1, Math.floor(bounds.width));
        frameCanvas.height = Math.max(1, Math.floor(bounds.height));

        const frameContext = frameCanvas.getContext('2d');
        if (!frameContext) {
            onFeedback(i18n.t('feedback.canvasUnavailable'));
            onToast(i18n.t('feedback.regionCanvasUnavailableToast'), 'error');
            return false;
        }

        frameContext.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = Math.max(1, Math.floor(regionRect.width));
        cropCanvas.height = Math.max(1, Math.floor(regionRect.height));
        const cropContext = cropCanvas.getContext('2d');
        if (!cropContext) {
            onFeedback(i18n.t('feedback.canvasUnavailable'));
            onToast(i18n.t('feedback.regionCropUnavailableToast'), 'error');
            return false;
        }

        cropContext.drawImage(
            frameCanvas,
            regionRect.x,
            regionRect.y,
            regionRect.width,
            regionRect.height,
            0,
            0,
            cropCanvas.width,
            cropCanvas.height,
        );

        const dataUrl = cropCanvas.toDataURL('image/png');
        await saveCapture(dataUrl, regionRect);
        return true;
    };

    return {
        captureFullFrame,
        captureRegion,
    };
}
