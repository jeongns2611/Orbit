import { type ThemePalette } from '@/constants/themeColors';
import { useThemeStore, type ThemeMode } from '@/store/themeStore';
import React, { createContext, useContext, useMemo } from 'react';

type ThemeContextValue = {
  theme: ThemePalette;
  isDark: boolean;
  themeMode: ThemeMode;
  setTheme: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useThemeStore((s) => s.theme);
  const _systemColorScheme = useThemeStore((s) => s.systemColorScheme);
  const getPalette = useThemeStore((s) => s.getPalette);
  const isDarkFn = useThemeStore((s) => s.isDark);
  const setTheme = useThemeStore((s) => s.setTheme);

  const isDark = isDarkFn();
  const theme = getPalette();

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark,
      themeMode,
      setTheme,
    }),
    [theme, isDark, themeMode, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx == null) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}