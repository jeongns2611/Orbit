import { ASYNC_STORAGE_KEYS } from '@/constants/keys';
import { darkTheme, lightTheme, type ThemePalette } from '@/constants/themeColors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, type ColorSchemeName } from 'react-native';
import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  hasHydrated: boolean;
  systemColorScheme: ColorSchemeName; // 'light' | 'dark' | null
  setTheme: (mode: ThemeMode) => Promise<void>;
  hydrate: () => Promise<void>;
  /** 실제 사용할 팔레트 (theme + system 반영) */
  getPalette: () => ThemePalette;
  /** 지금 다크 모드로 보여줄지 */
  isDark: () => boolean;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'system',
  hasHydrated: false,
  systemColorScheme: Appearance.getColorScheme(),

  setTheme: async (mode: ThemeMode) => {
    set({ theme: mode });
    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.THEME, mode);
    } catch (e) {
      console.warn('Theme persist failed', e);
    }
  },

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.THEME);
      const theme: ThemeMode =
        stored === 'light' || stored === 'dark' || stored === 'system'
          ? stored
          : 'system';
      set({
        theme,
        hasHydrated: true,
        systemColorScheme: Appearance.getColorScheme(),
      });
    } catch (e) {
      console.warn('Theme hydrate failed', e);
      set({ hasHydrated: true });
    }
  },

  getPalette: () => {
    const { theme, systemColorScheme } = get();
    const isDark =
      theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
    return isDark ? darkTheme : lightTheme;
  },

  isDark: () => {
    const { theme, systemColorScheme } = get();
    return theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  },
}));