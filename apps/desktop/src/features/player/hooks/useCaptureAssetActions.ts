import type { AssetMenuState } from '../ui/types';
import { useAssetMenuActions } from './capture/useAssetMenuActions';
import { useCaptureSaver } from './capture/useCaptureSaver';
import { useOcrActions } from './capture/useOcrActions';

type Params = {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    sourceUrl: string | null;
    currentTimeMs: number;
    isOcrRunning: boolean;
    setIsOcrRunning: (value: boolean) => void;
    assetMenu: AssetMenuState | null;
    setAssetMenu: (value: AssetMenuState | null) => void;
    addItem: (item: any) => void;
    removeItem: (assetId: string) => void;
    setSelectedAssetId: (assetId: string | null) => void;
    onFeedback: (message: string) => void;
    onToast: (message: string, level?: 'info' | 'success' | 'error') => void;
};

export function useCaptureAssetActions({
    videoRef,
    sourceUrl,
    currentTimeMs,
    isOcrRunning,
    setIsOcrRunning,
    assetMenu,
    setAssetMenu,
    addItem,
    removeItem,
    setSelectedAssetId,
    onFeedback,
    onToast,
}: Params) {
    const { captureFullFrame, captureRegion } = useCaptureSaver({
        videoRef,
        sourceUrl,
        currentTimeMs,
        addItem,
        onFeedback,
        onToast,
    });

    const { captureFullFrameWithOcr } = useOcrActions({
        isOcrRunning,
        setIsOcrRunning,
        captureFullFrame,
        onFeedback,
        onToast,
    });

    const { openAssetFolder, deleteAsset } = useAssetMenuActions({
        assetMenu,
        setAssetMenu,
        removeItem,
        setSelectedAssetId,
        onToast,
    });

    return {
        captureFullFrame,
        captureFullFrameWithOcr,
        openAssetFolder,
        deleteAsset,
        captureRegion,
    };
}
