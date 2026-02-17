import { noaDesktopClient } from '../../../../ipc';

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
        onFeedback('正在执行截图并调用后端 OCR，请稍候...');
        onToast('OCR 处理中（后端识别）...', 'info');

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
                onFeedback(`OCR 失败：${result.error.message}`);
                onToast(`OCR 失败：${result.error.message}`, 'error');
                return;
            }

            if (!result.data.success) {
                onFeedback(`OCR 失败：${result.data.message}`);
                onToast(`OCR 失败：${result.data.message}`, 'error');
                return;
            }

            const text = result.data.text.trim();
            if (!text) {
                onFeedback(result.data.message);
                onToast('OCR 未识别到有效文本。', 'info');
                return;
            }

            onFeedback(`OCR 完成（${result.data.usedLanguage}），已复制文本（${text.length} 字符）。`);
            onToast(`OCR 完成（${result.data.usedLanguage}），文本已复制到剪贴板。`, 'success');
        } catch {
            onFeedback('OCR 失败：后端识别服务异常。');
            onToast('OCR 失败：后端识别服务异常。', 'error');
        } finally {
            setIsOcrRunning(false);
        }
    };

    return {
        captureFullFrameWithOcr,
    };
}
