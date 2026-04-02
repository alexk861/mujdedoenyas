import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enJSON from './locales/en.json';
import trJSON from './locales/tr.json';
import itJSON from './locales/it.json';

const resources = {
  en: { translation: enJSON },
  tr: { translation: trJSON },
  it: { translation: itJSON },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'tr',
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
