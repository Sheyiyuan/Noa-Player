import { noaDesktopClient } from '../../../ipc';

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
            <div className="titlebar__brand">NoaStudio</div>
            <div className="titlebar__window-actions no-drag">
                <button type="button" aria-label="最小化窗口" onClick={onMinimize}>—</button>
                <button type="button" aria-label="最大化窗口" onClick={onToggleMaximize}>□</button>
                <button type="button" aria-label="关闭窗口" onClick={onClose}>✕</button>
            </div>
        </header>
    );
}