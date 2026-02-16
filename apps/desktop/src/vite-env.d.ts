/// <reference types="vite/client" />

import type { NoaDesktopApi } from './ipc';

declare global {
    interface Window {
        noaDesktop: NoaDesktopApi;
    }
}

export { };
