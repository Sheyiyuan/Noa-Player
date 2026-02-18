import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { resources, type SupportedLanguage } from './resources';

const supportedLanguages: SupportedLanguage[] = ['zh-CN', 'zh-TW', 'en'];

const normalizeLanguage = (value: string | undefined): SupportedLanguage => {
    if (!value) {
        return 'zh-CN';
    }

    if (value === 'zh-TW' || value.toLowerCase().startsWith('zh-hk')) {
        return 'zh-TW';
    }

    if (value === 'en' || value.toLowerCase().startsWith('en')) {
        return 'en';
    }

    return 'zh-CN';
};

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'zh-CN',
        supportedLngs: supportedLanguages,
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: 'noa-studio-lang',
            caches: ['localStorage'],
        },
    });

const applyDocumentLanguage = (language: string) => {
    const normalized = normalizeLanguage(language);
    document.documentElement.lang = normalized;
    return normalized;
};

applyDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);

i18n.on('languageChanged', (language) => {
    applyDocumentLanguage(language);
});

export const changeLanguage = async (language: SupportedLanguage) => {
    await i18n.changeLanguage(language);
};

export const getNormalizedLanguage = (): SupportedLanguage => normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

export default i18n;
