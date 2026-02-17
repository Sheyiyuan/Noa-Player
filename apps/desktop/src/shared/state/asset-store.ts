import { create } from 'zustand';

type AssetSummary = {
    id: string;
    imagePath: string;
    fileUrl: string;
    previewDataUrl: string;
    mimeType: string;
    sourceUrl: string | null;
    timestampMs: number;
    width: number;
    height: number;
    createdAt: string;
};

type AssetState = {
    items: AssetSummary[];
    selectedAssetId: string | null;
    setItems: (items: AssetSummary[]) => void;
    addItem: (item: AssetSummary) => void;
    removeItem: (assetId: string) => void;
    setSelectedAssetId: (assetId: string | null) => void;
};

export const useAssetStore = create<AssetState>((set) => ({
    items: [],
    selectedAssetId: null,
    setItems: (items) => set({ items }),
    addItem: (item) => set((state) => ({ items: [item, ...state.items] })),
    removeItem: (assetId) => set((state) => ({
        items: state.items.filter((item) => item.id !== assetId),
        selectedAssetId: state.selectedAssetId === assetId ? null : state.selectedAssetId,
    })),
    setSelectedAssetId: (selectedAssetId) => set({ selectedAssetId }),
}));
