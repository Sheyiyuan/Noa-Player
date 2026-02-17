import { noaDesktopClient } from '../../../../ipc';
import type { AssetMenuState } from '../../ui/types';

type Params = {
    assetMenu: AssetMenuState | null;
    setAssetMenu: (value: AssetMenuState | null) => void;
    removeItem: (assetId: string) => void;
    setSelectedAssetId: (assetId: string | null) => void;
    onToast: (message: string, level?: 'info' | 'success' | 'error') => void;
};

export function useAssetMenuActions({
    assetMenu,
    setAssetMenu,
    removeItem,
    setSelectedAssetId,
    onToast,
}: Params) {
    const openAssetFolder = async () => {
        if (!assetMenu) {
            return;
        }

        const result = await noaDesktopClient.openAssetInFolder({ assetId: assetMenu.assetId });
        if (!result.ok || !result.data.success) {
            onToast('打开所在文件夹失败：素材可能已不存在。', 'error');
            return;
        }

        onToast('已打开素材所在文件夹。', 'info');
    };

    const deleteAsset = async () => {
        if (!assetMenu) {
            return;
        }

        const { assetId } = assetMenu;
        const result = await noaDesktopClient.deleteAsset({ assetId });
        if (!result.ok || !result.data.success) {
            onToast('删除素材失败：素材可能已不存在。', 'error');
            return;
        }

        removeItem(assetId);
        setSelectedAssetId(null);
        setAssetMenu(null);
        onToast('素材已删除。', 'success');
    };

    return {
        openAssetFolder,
        deleteAsset,
    };
}
