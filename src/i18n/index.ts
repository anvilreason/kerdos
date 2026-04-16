import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import zh from './locales/zh.json';
import fr from './locales/fr.json';
import ru from './locales/ru.json';
import es from './locales/es.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import pt from './locales/pt.json';
import ja from './locales/ja.json';
import ur from './locales/ur.json';
import id from './locales/id.json';
import de from './locales/de.json';
import pa from './locales/pa.json';
import sw from './locales/sw.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
      fr: { translation: fr },
      ru: { translation: ru },
      es: { translation: es },
      ar: { translation: ar },
      hi: { translation: hi },
      bn: { translation: bn },
      pt: { translation: pt },
      ja: { translation: ja },
      ur: { translation: ur },
      id: { translation: id },
      de: { translation: de },
      pa: { translation: pa },
      sw: { translation: sw },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
