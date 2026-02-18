import { useLayoutEffect, useRef, useState } from 'react';
import { FolderOpen, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AssetMenuState } from './types';

type AssetContextMenuProps = {
    assetMenu: AssetMenuState | null;
    onOpenAssetFolder: () => void | Promise<void>;
    onDeleteAsset: () => void | Promise<void>;
};

export function AssetContextMenu({ assetMenu, onOpenAssetFolder, onDeleteAsset }: AssetContextMenuProps) {
    const { t } = useTranslation();
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

    const clampPosition = (rawX: number, rawY: number, menuWidth: number, menuHeight: number) => {
        const padding = 8;
        const maxX = Math.max(padding, window.innerWidth - menuWidth - padding);
        const maxY = Math.max(padding, window.innerHeight - menuHeight - padding);
        return {
            x: Math.min(Math.max(rawX, padding), maxX),
            y: Math.min(Math.max(rawY, padding), maxY),
        };
    };

    useLayoutEffect(() => {
        if (!assetMenu || !menuRef.current) {
            setPosition(null);
            return;
        }

        const rect = menuRef.current.getBoundingClientRect();
        setPosition(clampPosition(assetMenu.x, assetMenu.y, rect.width, rect.height));
    }, [assetMenu]);

    if (!assetMenu) {
        return null;
    }

    return (
        <div
            ref={menuRef}
            className="asset-menu"
            style={{
                left: `${position?.x ?? assetMenu.x}px`,
                top: `${position?.y ?? assetMenu.y}px`,
            }}
            onClick={(event) => event.stopPropagation()}
        >
            <button type="button" onClick={onOpenAssetFolder}><FolderOpen size={15} />{t('asset.menuOpenFolder')}</button>
            <button type="button" onClick={onDeleteAsset}><Trash2 size={15} />{t('asset.menuDelete')}</button>
        </div>
    );
}
