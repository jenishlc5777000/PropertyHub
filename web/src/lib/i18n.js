import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { i18nResources } from '@propertyhub/shared';

let lng = 'en';
try {
  lng = localStorage.getItem('ph_lang') || (navigator.language || 'en').slice(0, 2);
} catch {
  /* storage unavailable */
}
if (!i18nResources[lng]) lng = 'en';

i18n.use(initReactI18next).init({
  resources: i18nResources,
  lng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (l) => {
  document.documentElement.lang = l;
  try {
    localStorage.setItem('ph_lang', l);
  } catch {
    /* ignore */
  }
});
document.documentElement.lang = lng;

export default i18n;
