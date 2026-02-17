import { FolderOpen, Trash2 } from 'lucide-react';
import type { AssetMenuState } from './types';

type AssetContextMenuProps = {
    assetMenu: AssetMenuState | null;
    onOpenAssetFolder: () => void | Promise<void>;
    onDeleteAsset: () => void | Promise<void>;
};

export function AssetContextMenu({ assetMenu, onOpenAssetFolder, onDeleteAsset }: AssetContextMenuProps) {
    if (!assetMenu) {
        return null;
    }

    return (
        <div
            className="asset-menu"
            style={{ left: `${assetMenu.x}px`, top: `${assetMenu.y}px` }}
            onClick={(event) => event.stopPropagation()}
        >
            <button type="button" onClick={onOpenAssetFolder}><FolderOpen size={15} />打开所在文件夹</button>
            <button type="button" onClick={onDeleteAsset}><Trash2 size={15} />删除素材</button>
        </div>
    );
}
