import { useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Rect } from '../ui/types';

type Params = {
    onFeedback: (message: string) => void;
    onToast: (message: string, level?: 'info' | 'success' | 'error') => void;
    onCaptureRegion: (region: Rect, bounds: DOMRect) => Promise<boolean>;
};

export function useRegionSelection({ onFeedback, onToast, onCaptureRegion }: Params) {
    const [isRegionMode, setIsRegionMode] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

    const regionRect = useMemo<Rect | null>(() => {
        if (!dragStart || !dragCurrent) {
            return null;
        }

        const x = Math.min(dragStart.x, dragCurrent.x);
        const y = Math.min(dragStart.y, dragCurrent.y);
        const width = Math.abs(dragCurrent.x - dragStart.x);
        const height = Math.abs(dragCurrent.y - dragStart.y);

        if (width < 2 || height < 2) {
            return null;
        }

        return { x, y, width, height };
    }, [dragCurrent, dragStart]);

    const startRegionCapture = () => {
        setIsRegionMode(true);
        setDragStart(null);
        setDragCurrent(null);
        onFeedback('区域截图模式：请在视频上拖拽选区。');
        onToast('已进入区域截图模式。', 'info');
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isRegionMode) {
            return;
        }

        const bounds = event.currentTarget.getBoundingClientRect();
        setDragStart({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
        setDragCurrent({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isRegionMode || !dragStart) {
            return;
        }

        const bounds = event.currentTarget.getBoundingClientRect();
        setDragCurrent({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    };

    const onPointerUp = async (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isRegionMode || !dragStart || !regionRect) {
            return;
        }

        const bounds = event.currentTarget.getBoundingClientRect();
        const saved = await onCaptureRegion(regionRect, bounds);
        if (saved) {
            setIsRegionMode(false);
            setDragStart(null);
            setDragCurrent(null);
        }
    };

    return {
        isRegionMode,
        regionRect,
        startRegionCapture,
        onPointerDown,
        onPointerMove,
        onPointerUp,
    };
}
