import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18nResources } from '@propertyhub/shared';

const device = getLocales()?.[0]?.languageCode || 'en';

i18n.use(initReactI18next).init({
  resources: i18nResources,
  lng: i18nResources[device] ? device : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

// Restore a previously chosen language.
AsyncStorage.getItem('ph_lang').then((l) => l && i18nResources[l] && i18n.changeLanguage(l));
i18n.on('languageChanged', (l) => AsyncStorage.setItem('ph_lang', l).catch(() => {}));

export default i18n;
