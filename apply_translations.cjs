const fs = require('fs');

const t1 = JSON.parse(fs.readFileSync('translations.json', 'utf8'));
const t2 = JSON.parse(fs.readFileSync('translations2.json', 'utf8'));
const t3 = JSON.parse(fs.readFileSync('translations3.json', 'utf8'));

const combined = { ...t1, ...t2, ...t3 };

const zhTranslation = {};
const svTranslation = {};
const enTranslation = {};

for (const [key, value] of Object.entries(combined)) {
  enTranslation[key] = key;
  zhTranslation[key] = value.zh;
  svTranslation[key] = value.sv;
}

const newI18n = `// @ts-nocheck
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: ${JSON.stringify(enTranslation, null, 6)}
  },
  zh: {
    translation: ${JSON.stringify(zhTranslation, null, 6)}
  },
  sv: {
    translation: ${JSON.stringify(svTranslation, null, 6)}
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    }
  });

export default i18n;
`;

fs.writeFileSync('src/i18n.ts', newI18n);
