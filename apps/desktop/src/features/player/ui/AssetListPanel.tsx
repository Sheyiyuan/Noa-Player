import type { AssetSummary } from '../../../ipc';
import { useTranslation } from 'react-i18next';
import { formatTime } from './player-utils';

type AssetListPanelProps = {
    items: AssetSummary[];
    onAssetContextMenu: (payload: { assetId: string; x: number; y: number }) => void;
    ocrSummaries: Record<string, string>;
    ocrLoadingByAssetId: Record<string, boolean>;
    onRunAssetOcr: (assetId: string) => void | Promise<void>;
    onInsertAsset: (asset: AssetSummary) => void;
};

export function AssetListPanel({
    items,
    onAssetContextMenu,
    ocrSummaries,
    ocrLoadingByAssetId,
    onRunAssetOcr,
    onInsertAsset,
}: AssetListPanelProps) {
    const { t } = useTranslation();

    return (
        <section className="asset-list">
            <h2>{t('asset.title', { count: items.length })}</h2>
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
                        <div className="asset-item-content">
                            <div className="asset-item-meta">{formatTime(item.timestampMs)}</div>
                            <div className="asset-item-actions">
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        void onRunAssetOcr(item.id);
                                    }}
                                    disabled={ocrLoadingByAssetId[item.id] === true}
                                >
                                    {ocrLoadingByAssetId[item.id] ? t('asset.ocrRunning') : t('asset.ocr')}
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onInsertAsset(item);
                                    }}
                                >
                                    {t('asset.insertImage')}
                                </button>
                            </div>
                            {ocrSummaries[item.id] ? (
                                <p className="asset-item-ocr-summary" title={ocrSummaries[item.id]}>
                                    {t('asset.ocrSummary', { summary: ocrSummaries[item.id] })}
                                </p>
                            ) : null}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
