/// <reference types="vite/client" />

import type { NoaDesktopApi } from './shared/ipc/contracts';

declare global {
    interface Window {
        noaDesktop: NoaDesktopApi;
    }
}

export { };
