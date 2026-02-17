import { noaDesktopClient } from '../../../../ipc';
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
    const saveCapture = async (dataUrl: string, region?: Rect) => {
        const result = await noaDesktopClient.saveCapture({
            dataUrl,
            sourceUrl,
            timestampMs: currentTimeMs,
            region,
        });

        if (!result.ok) {
            onFeedback(`截图保存失败：${result.error.message}`);
            onToast(`截图保存失败：${result.error.message}`, 'error');
            return null;
        }

        addItem(result.data.asset);
        onFeedback(`截图保存成功：${result.data.asset.id}`);
        onToast('截图保存成功，图片已自动复制到系统剪贴板。', 'success');
        return result.data.asset;
    };

    const captureFullFrame = async () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight) {
            onFeedback('当前视频尚未就绪，无法截图。');
            onToast('截图失败：视频尚未完成解码，稍后重试。', 'error');
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext('2d');
        if (!context) {
            onFeedback('浏览器上下文不可用，无法截图。');
            onToast('截图失败：Canvas 上下文不可用。', 'error');
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
            onFeedback('浏览器上下文不可用，无法截图。');
            onToast('区域截图失败：Canvas 上下文不可用。', 'error');
            return false;
        }

        frameContext.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = Math.max(1, Math.floor(regionRect.width));
        cropCanvas.height = Math.max(1, Math.floor(regionRect.height));
        const cropContext = cropCanvas.getContext('2d');
        if (!cropContext) {
            onFeedback('浏览器上下文不可用，无法截图。');
            onToast('区域截图失败：裁剪上下文不可用。', 'error');
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
