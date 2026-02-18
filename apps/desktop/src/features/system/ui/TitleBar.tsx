import { noaDesktopClient } from '../../../ipc';
import { Minus, Settings, Square, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getNormalizedLanguage } from '../../../i18n';
import { useEffect, useRef, useState } from 'react';
import useDarkMode from 'use-dark-mode';
import { usePreferencesStore } from '../../../shared/state/preferences-store';

export function TitleBar() {
    const { t } = useTranslation();
    const menuRef = useRef<HTMLDivElement | null>(null);
    const language = usePreferencesStore((state) => state.language);
    const themeMode = usePreferencesStore((state) => state.themeMode);
    const copyCaptureToClipboard = usePreferencesStore((state) => state.copyCaptureToClipboard);
    const setLanguage = usePreferencesStore((state) => state.setLanguage);
    const setThemeMode = usePreferencesStore((state) => state.setThemeMode);
    const setCopyCaptureToClipboard = usePreferencesStore((state) => state.setCopyCaptureToClipboard);
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
    const [isSystemDark, setIsSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
    const darkMode = useDarkMode(true, {
        classNameDark: 'theme-dark',
        classNameLight: 'theme-light',
    });

    const resolvedTheme = themeMode === 'system'
        ? (isSystemDark ? 'dark' : 'light')
        : themeMode;

    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const update = (event: MediaQueryListEvent | MediaQueryList) => {
            setIsSystemDark(event.matches);
        };

        update(media);

        const listener = (event: MediaQueryListEvent) => update(event);
        media.addEventListener('change', listener);

        return () => {
            media.removeEventListener('change', listener);
        };
    }, []);

    useEffect(() => {
        if (resolvedTheme === 'dark') {
            darkMode.enable();
            return;
        }

        darkMode.disable();
    }, [darkMode, resolvedTheme]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', resolvedTheme);
    }, [resolvedTheme]);

    useEffect(() => {
        const closeByOutside = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) {
                setIsPreferencesOpen(false);
            }
        };
        const closeByEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsPreferencesOpen(false);
            }
        };

        window.addEventListener('mousedown', closeByOutside);
        window.addEventListener('keydown', closeByEscape);
        return () => {
            window.removeEventListener('mousedown', closeByOutside);
            window.removeEventListener('keydown', closeByEscape);
        };
    }, []);

    useEffect(() => {
        const normalized = getNormalizedLanguage();
        if (normalized !== language) {
            setLanguage(normalized);
        }
    }, [language, setLanguage]);

    const onMinimize = async () => {
        await noaDesktopClient.minimizeWindow();
    };

    const onToggleMaximize = async () => {
        await noaDesktopClient.toggleMaximizeWindow();
    };

    const onClose = async () => {
        await noaDesktopClient.closeWindow();
    };

    const onLanguageChange = async (nextLanguage: 'zh-CN' | 'zh-TW' | 'en') => {
        setLanguage(nextLanguage);
        await changeLanguage(nextLanguage);
    };

    const onThemeChange = (nextTheme: 'system' | 'dark' | 'light') => {
        setThemeMode(nextTheme);
    };

    return (
        <header className="titlebar" role="banner">
            <div className="titlebar__brand">Noa Studio</div>
            <div className="titlebar__window-actions no-drag">
                <div className="titlebar__preferences" ref={menuRef}>
                    <button
                        type="button"
                        className="titlebar__preferences-trigger"
                        aria-label={t('preferences.label')}
                        title={t('preferences.label')}
                        onClick={() => setIsPreferencesOpen((prev) => !prev)}
                    >
                        <Settings size={14} />
                    </button>
                    {isPreferencesOpen ? (
                        <div className="titlebar__preferences-menu">
                            <label className="titlebar__preferences-row">
                                <span>{t('language.label')}</span>
                                <select value={language} onChange={(event) => onLanguageChange(event.target.value as 'zh-CN' | 'zh-TW' | 'en')}>
                                    <option value="zh-CN">{t('language.zhCN')}</option>
                                    <option value="zh-TW">{t('language.zhTW')}</option>
                                    <option value="en">{t('language.en')}</option>
                                </select>
                            </label>
                            <label className="titlebar__preferences-row">
                                <span>{t('theme.label')}</span>
                                <select value={themeMode} onChange={(event) => onThemeChange(event.target.value as 'system' | 'dark' | 'light')}>
                                    <option value="system">{t('theme.system')}</option>
                                    <option value="dark">{t('theme.dark')}</option>
                                    <option value="light">{t('theme.light')}</option>
                                </select>
                            </label>
                            <label className="titlebar__preferences-check">
                                <input
                                    type="checkbox"
                                    checked={copyCaptureToClipboard}
                                    onChange={(event) => setCopyCaptureToClipboard(event.currentTarget.checked)}
                                />
                                <span>{t('preferences.copyCaptureToClipboard')}</span>
                            </label>
                        </div>
                    ) : null}
                </div>
                <button type="button" aria-label={t('titlebar.minimize')} title={t('titlebar.minimize')} onClick={onMinimize}><Minus size={14} /></button>
                <button type="button" aria-label={t('titlebar.maximize')} title={t('titlebar.maximize')} onClick={onToggleMaximize}><Square size={12} /></button>
                <button type="button" aria-label={t('titlebar.close')} title={t('titlebar.close')} onClick={onClose}><X size={14} /></button>
            </div>
        </header>
    );
}