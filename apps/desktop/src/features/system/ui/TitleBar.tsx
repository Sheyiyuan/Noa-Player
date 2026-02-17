import { noaDesktopClient } from '../../../ipc';
import { Minus, Square, X } from 'lucide-react';

export function TitleBar() {
    const onMinimize = async () => {
        await noaDesktopClient.minimizeWindow();
    };

    const onToggleMaximize = async () => {
        await noaDesktopClient.toggleMaximizeWindow();
    };

    const onClose = async () => {
        await noaDesktopClient.closeWindow();
    };

    return (
        <header className="titlebar" role="banner">
            <div className="titlebar__brand">Noa Studio</div>
            <div className="titlebar__window-actions no-drag">
                <button type="button" aria-label="最小化窗口" title="最小化窗口" onClick={onMinimize}><Minus size={14} /></button>
                <button type="button" aria-label="最大化窗口" title="最大化窗口" onClick={onToggleMaximize}><Square size={12} /></button>
                <button type="button" aria-label="关闭窗口" title="关闭窗口" onClick={onClose}><X size={14} /></button>
            </div>
        </header>
    );
}