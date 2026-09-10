const fs = require('fs');
const extracted = require('./all_extracted_keys.json');

const t1 = require('./translations.json');
const t2 = require('./translations2.json');
const t3 = require('./translations3.json');
const t4 = require('./translations4.json');
const t5 = require('./translations5.json');
const t6 = require('./translations6.json');
const t7 = require('./translations7.json');
const t8 = require('./translations8.json');
const t9 = require('./translations9.json');
const t10 = require('./translations10.json');
const t11 = require('./translations11.json');

const combined = { ...t1, ...t2, ...t3, ...t4, ...t5, ...t6, ...t7, ...t8, ...t9, ...t10, ...t11 };
const zhTranslation = {};
const svTranslation = {};
const enTranslation = {};

const allKeys = new Set([...extracted, ...Object.keys(combined)]);

for (const key of allKeys) {
  enTranslation[key] = key;
  if (combined[key]) {
    zhTranslation[key] = combined[key].zh;
    svTranslation[key] = combined[key].sv;
  } else {
    zhTranslation[key] = key;
    svTranslation[key] = key;
  }
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
