import { create } from 'zustand';

type Language = 'zh-CN' | 'zh-TW' | 'en';
type ThemeMode = 'system' | 'dark' | 'light';

type PreferencesState = {
    language: Language;
    themeMode: ThemeMode;
    copyCaptureToClipboard: boolean;
    setLanguage: (language: Language) => void;
    setThemeMode: (themeMode: ThemeMode) => void;
    setCopyCaptureToClipboard: (value: boolean) => void;
};

const STORAGE_KEY = 'noa-studio-preferences';

function loadPreferences() {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as Partial<PreferencesState>;
        return {
            language: parsed.language,
            themeMode: parsed.themeMode,
            copyCaptureToClipboard: parsed.copyCaptureToClipboard,
        };
    } catch {
        return null;
    }
}

function persistPreferences(state: Pick<PreferencesState, 'language' | 'themeMode' | 'copyCaptureToClipboard'>) {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const loaded = loadPreferences();

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
    language: loaded?.language === 'zh-CN' || loaded?.language === 'zh-TW' || loaded?.language === 'en'
        ? loaded.language
        : 'zh-CN',
    themeMode: loaded?.themeMode === 'system' || loaded?.themeMode === 'dark' || loaded?.themeMode === 'light'
        ? loaded.themeMode
        : 'system',
    copyCaptureToClipboard: typeof loaded?.copyCaptureToClipboard === 'boolean'
        ? loaded.copyCaptureToClipboard
        : true,
    setLanguage: (language) => {
        set({ language });
        const state = get();
        persistPreferences({
            language,
            themeMode: state.themeMode,
            copyCaptureToClipboard: state.copyCaptureToClipboard,
        });
    },
    setThemeMode: (themeMode) => {
        set({ themeMode });
        const state = get();
        persistPreferences({
            language: state.language,
            themeMode,
            copyCaptureToClipboard: state.copyCaptureToClipboard,
        });
    },
    setCopyCaptureToClipboard: (copyCaptureToClipboard) => {
        set({ copyCaptureToClipboard });
        const state = get();
        persistPreferences({
            language: state.language,
            themeMode: state.themeMode,
            copyCaptureToClipboard,
        });
    },
}));
