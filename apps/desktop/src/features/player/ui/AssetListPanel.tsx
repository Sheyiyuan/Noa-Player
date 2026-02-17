import type { AssetSummary } from '../../../ipc';
import { formatTime } from './player-utils';

type AssetListPanelProps = {
    items: AssetSummary[];
    onAssetContextMenu: (payload: { assetId: string; x: number; y: number }) => void;
};

export function AssetListPanel({ items, onAssetContextMenu }: AssetListPanelProps) {
    return (
        <section className="asset-list">
            <h2>素材库（{items.length}）</h2>
            <div className="asset-grid">
                {items.map((item) => (
                    <article
                        key={item.id}
                        className="asset-item"
                        onContextMenu={(event) => {
                            event.preventDefault();
                            onAssetContextMenu({
                                assetId: item.id,
                                x: event.clientX,
                                y: event.clientY,
                            });
                        }}
                    >
                        <img src={item.previewDataUrl} alt={item.id} />
                        <div>{formatTime(item.timestampMs)}</div>
                    </article>
                ))}
            </div>
        </section>
    );
}
