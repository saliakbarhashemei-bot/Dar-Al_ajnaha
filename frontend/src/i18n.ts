import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fa from './locales/fa.json';

const STORAGE_KEY = 'dar-lang';

function initialLanguage(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? 'fa';
  } catch {
    return 'fa';
  }
}

function applyDirection(lng: string): void {
  const dir = lng === 'fa' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fa: { translation: fa },
  },
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

applyDirection(i18n.language);
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // storage unavailable (private mode); language still applies for the session
  }
  applyDirection(lng);
});

export default i18n;
