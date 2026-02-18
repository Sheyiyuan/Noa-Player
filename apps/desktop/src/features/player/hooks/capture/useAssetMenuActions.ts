import { noaDesktopClient } from '../../../../ipc';
import i18n from '../../../../i18n';
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
            onToast(i18n.t('feedback.openFolderFailed'), 'error');
            return;
        }

        onToast(i18n.t('feedback.openFolderDone'), 'info');
    };

    const deleteAsset = async () => {
        if (!assetMenu) {
            return;
        }

        const { assetId } = assetMenu;
        const result = await noaDesktopClient.deleteAsset({ assetId });
        if (!result.ok || !result.data.success) {
            onToast(i18n.t('feedback.deleteAssetFailed'), 'error');
            return;
        }

        removeItem(assetId);
        setSelectedAssetId(null);
        setAssetMenu(null);
        onToast(i18n.t('feedback.assetDeleted'), 'success');
    };

    return {
        openAssetFolder,
        deleteAsset,
    };
}
