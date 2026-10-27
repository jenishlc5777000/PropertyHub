import { createContext, useContext } from 'react';

const base = {
  brand: '#0f2a4a',
  brand700: '#163a62',
  accent: '#059669',
  accentDark: '#047857',
  danger: '#dc2626',
  warning: '#d97706',
  whatsapp: '#25D366',
  radius: 14,
};

export const lightColors = {
  ...base,
  bg: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  input: '#ffffff',
  skeleton: '#e2e8f0',
  accentSoft: '#ecfdf5',
  dark: false,
};

export const darkColors = {
  ...base,
  bg: '#020617',
  card: '#0f172a',
  text: '#f1f5f9',
  muted: '#94a3b8',
  border: '#1e293b',
  input: '#0f172a',
  skeleton: '#1e293b',
  accentSoft: 'rgba(5,150,105,0.12)',
  brand: '#1d4674',
  dark: true,
};

export const ThemeContext = createContext({ colors: lightColors, mode: 'system', setMode: () => {} });
export const useTheme = () => useContext(ThemeContext);
