import { createContext, useContext } from 'react';

// Tokens mirror DESIGN.md ("warm paper, navy ink") and web/src/index.css.
const base = {
  brand: '#0f2a4a', // navy: hero, dark buttons, footer-style blocks
  brand700: '#163a62',
  accent: '#047857', // the one action colour (white text 5.48:1)
  accentDark: '#065f46',
  accentBright: '#34d399', // accent text on navy
  gold: '#b7862f', // "Featured" only
  danger: '#b91c1c',
  warning: '#b45309',
  whatsapp: '#25D366',
  radius: 20,
};

export const lightColors = {
  ...base,
  bg: '#faf8f4', // paper
  card: '#ffffff',
  text: '#111a2b', // ink
  body: '#3a3631',
  muted: '#6f685e',
  border: '#e6e0d6',
  subtle: '#f3efe8',
  input: '#ffffff',
  skeleton: '#efe9df',
  accentSoft: '#ecfdf5',
  chipActiveBg: '#111a2b',
  chipActiveText: '#ffffff',
  dark: false,
};

export const darkColors = {
  ...base,
  bg: '#0a1120',
  card: '#111a2b',
  text: '#f3efe8',
  body: '#d2cabd',
  muted: '#a39a8c',
  border: '#1f2a3d',
  subtle: '#1a2436',
  input: '#111a2b',
  skeleton: '#1a2436',
  accentSoft: 'rgba(52,211,153,0.12)',
  chipActiveBg: '#f3efe8',
  chipActiveText: '#111a2b',
  brand: '#12304f',
  dark: true,
};

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayMedium: 'Fraunces_500Medium',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
};

/** Navy-tinted shadows, never grey-black. */
export const shadows = {
  card: { shadowColor: '#0f2a4a', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  lift: { shadowColor: '#0f2a4a', shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
};

export const ThemeContext = createContext({ colors: lightColors, mode: 'system', setMode: () => {} });
export const useTheme = () => useContext(ThemeContext);
