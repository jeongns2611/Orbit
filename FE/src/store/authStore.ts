import { ASYNC_STORAGE_KEYS } from '@/constants/keys';
import { resetToLogin } from '@/navigation/rootNavigation';
import { authApi, childrenApi, usersApi } from '@/services';
import { useRegistrationStore } from '@/store/registrationStore';
import { useSSEStore } from '@/store/sseStore';
import { useTimelineByDateStore } from '@/store/timelineByDateStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string | null;
  expiresIn: number | null;
  nickname: string | null;
  tokenIssuedAt: number | null;
  passwordLength: number | null;
  hasHydrated: boolean;
  isAuthenticated: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    nickname: string;
    name?: string | null;
    birth?: string | null;
  }) => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  logout: () => Promise<void>;
  withdraw: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  tokenType: null,
  expiresIn: null,
  nickname: null,
  tokenIssuedAt: null,
  passwordLength: null,
  hasHydrated: false,
  isAuthenticated: false,
  hydrate: async () => {
    useTimelineByDateStore.getState().hydrate();
    try {
      const [accessToken, refreshToken, tokenType, expiresInStr, nickname, issuedAtStr, passwordLengthStr] = await Promise.all([
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.TOKEN_TYPE),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.EXPIRES_IN),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.NICKNAME),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.TOKEN_ISSUED_AT),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.PASSWORD_LENGTH),
      ]);
      const expiresIn = expiresInStr ? Number(expiresInStr) : null;
      const tokenIssuedAt = issuedAtStr ? Number(issuedAtStr) : null;
      const passwordLength = passwordLengthStr ? Number(passwordLengthStr) : null;
      const isExpired =
        expiresIn != null &&
        tokenIssuedAt != null &&
        Date.now() >= tokenIssuedAt + expiresIn * 1000;
      if (isExpired && refreshToken) {
        try {
          const refreshed = await authApi.refresh({ refresh_token: refreshToken });
          const newIssuedAt = Date.now();
          await Promise.all([
            AsyncStorage.setItem(ASYNC_STORAGE_KEYS.ACCESS_TOKEN, refreshed.access_token),
            AsyncStorage.setItem(ASYNC_STORAGE_KEYS.REFRESH_TOKEN, refreshed.refresh_token),
            AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TOKEN_TYPE, refreshed.token_type),
            AsyncStorage.setItem(ASYNC_STORAGE_KEYS.EXPIRES_IN, String(refreshed.expires_in)),
            AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TOKEN_ISSUED_AT, String(newIssuedAt)),
          ]);
          set({
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token,
            tokenType: refreshed.token_type,
            expiresIn: refreshed.expires_in,
            tokenIssuedAt: newIssuedAt,
            passwordLength,
            nickname,
            isAuthenticated: true,
            hasHydrated: true,
          });
          return;
        } catch (error) {
          console.warn('Failed to refresh token during hydrate:', error);
        }
      }
      if (isExpired) {
        await Promise.all([
          AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.ACCESS_TOKEN),
          AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.REFRESH_TOKEN),
          AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.TOKEN_TYPE),
          AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.EXPIRES_IN),
          AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.TOKEN_ISSUED_AT),
          AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.NICKNAME),
          AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.PASSWORD_LENGTH),
        ]);
      }
      set({
        accessToken: isExpired ? null : accessToken,
        refreshToken: isExpired ? null : refreshToken,
        tokenType: isExpired ? null : tokenType,
        expiresIn: isExpired ? null : expiresIn,
        nickname: isExpired ? null : nickname,
        tokenIssuedAt: isExpired ? null : tokenIssuedAt,
        passwordLength: isExpired ? null : passwordLength,
        isAuthenticated: Boolean(accessToken) && !isExpired,
        hasHydrated: true,
      });
    } catch (error) {
      console.error('Failed to hydrate auth state:', error);
      set({ hasHydrated: true });
    }
  },
  login: async (email, password) => {
    try {
      const result = await authApi.login({ email, password });
      const hasValidTokens =
        typeof result?.access_token === 'string' &&
        result.access_token.length > 0 &&
        typeof result?.refresh_token === 'string' &&
        result.refresh_token.length > 0 &&
        typeof result?.token_type === 'string' &&
        result.token_type.length > 0 &&
        typeof result?.expires_in === 'number' &&
        Number.isFinite(result.expires_in) &&
        result.expires_in > 0;

      if (!hasValidTokens) {
        throw new Error('INVALID_AUTH_RESPONSE');
      }

      const issuedAt = Date.now();
      const passwordLen = typeof password === 'string' ? password.length : 0;
      await Promise.all([
        AsyncStorage.setItem(ASYNC_STORAGE_KEYS.ACCESS_TOKEN, result.access_token),
        AsyncStorage.setItem(ASYNC_STORAGE_KEYS.REFRESH_TOKEN, result.refresh_token),
        AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TOKEN_TYPE, result.token_type),
        AsyncStorage.setItem(ASYNC_STORAGE_KEYS.EXPIRES_IN, String(result.expires_in)),
        AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TOKEN_ISSUED_AT, String(issuedAt)),
        AsyncStorage.setItem(ASYNC_STORAGE_KEYS.PASSWORD_LENGTH, String(passwordLen)),
      ]);
      set({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        tokenType: result.token_type,
        expiresIn: result.expires_in,
        tokenIssuedAt: issuedAt,
        passwordLength: passwordLen > 0 ? passwordLen : null,
        isAuthenticated: true,
      });
      try {
        const profile = await usersApi.getMe(result.access_token);
        await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.NICKNAME, profile.nickname);
        set({ nickname: profile.nickname });
        if (profile.device_id != null) {
          useRegistrationStore.getState().setDeviceRegistered(true);
          await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.DEVICE_REGISTERED, 'true');
          try {
            const child = await childrenApi.getChild(result.access_token);
            const childProfile = mapChildResponseToProfile(child);
            useRegistrationStore.getState().setChildProfileRegistered(true);
            useRegistrationStore.getState().setChildProfile(childProfile);
            await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_REGISTERED, 'true');
            await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_DATA, JSON.stringify(childProfile));
          } catch (error) {
            const err = error as { status?: number; data?: unknown };
            const detail =
              err?.data && typeof err.data === 'object' && 'detail' in err.data
                ? (err.data as { detail?: string }).detail
                : null;
            if (err?.status === 404 || detail === 'Child not found') {
              useRegistrationStore.getState().setChildProfileRegistered(false);
              useRegistrationStore.getState().setChildProfile(null);
              await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_REGISTERED);
              await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_DATA);
            }
          }
        } else {
          useRegistrationStore.getState().setDeviceRegistered(false);
          await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.DEVICE_REGISTERED);
        }
      } catch (error) {
        console.warn('Failed to load profile after login:', error);
      }
    } catch (error) {
    await Promise.all([
      AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.TOKEN_TYPE),
      AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.EXPIRES_IN),
      AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.TOKEN_ISSUED_AT),
      AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.NICKNAME),
      AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.PASSWORD_LENGTH),
    ]);
    set({
      accessToken: null,
      refreshToken: null,
      tokenType: null,
      expiresIn: null,
      nickname: null,
      tokenIssuedAt: null,
      passwordLength: null,
      isAuthenticated: false,
    });
    throw error;
    }
  },
  register: async (payload) => {
    const result = await authApi.register(payload);
    const issuedAt = Date.now();
    const passwordLen = typeof payload?.password === 'string' ? payload.password.length : 0;
    await Promise.all([
      AsyncStorage.setItem(ASYNC_STORAGE_KEYS.ACCESS_TOKEN, result.access_token),
      AsyncStorage.setItem(ASYNC_STORAGE_KEYS.REFRESH_TOKEN, result.refresh_token),
      AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TOKEN_TYPE, result.token_type),
      AsyncStorage.setItem(ASYNC_STORAGE_KEYS.EXPIRES_IN, String(result.expires_in)),
      AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TOKEN_ISSUED_AT, String(issuedAt)),
      AsyncStorage.setItem(ASYNC_STORAGE_KEYS.PASSWORD_LENGTH, String(passwordLen)),
    ]);
    set({
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      tokenType: result.token_type,
      expiresIn: result.expires_in,
      tokenIssuedAt: issuedAt,
      passwordLength: passwordLen > 0 ? passwordLen : null,
      isAuthenticated: true,
    });
    try {
      const profile = await usersApi.getMe(result.access_token);
      await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.NICKNAME, profile.nickname);
      set({ nickname: profile.nickname });
      if (profile.device_id != null) {
        useRegistrationStore.getState().setDeviceRegistered(true);
        await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.DEVICE_REGISTERED, 'true');
        try {
          const child = await childrenApi.getChild(result.access_token);
          const childProfile = mapChildResponseToProfile(child);
          useRegistrationStore.getState().setChildProfileRegistered(true);
          useRegistrationStore.getState().setChildProfile(childProfile);
          await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_REGISTERED, 'true');
          await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_DATA, JSON.stringify(childProfile));
        } catch (error) {
          const err = error as { status?: number; data?: unknown };
          const detail =
            err?.data && typeof err.data === 'object' && 'detail' in err.data
              ? (err.data as { detail?: string }).detail
              : null;
          if (err?.status === 404 || detail === 'Child not found') {
            useRegistrationStore.getState().setChildProfileRegistered(false);
            useRegistrationStore.getState().setChildProfile(null);
            await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_REGISTERED);
            await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_DATA);
          }
        }
      } else {
        useRegistrationStore.getState().setDeviceRegistered(false);
        await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.DEVICE_REGISTERED);
      }
    } catch (error) {
      console.warn('Failed to load profile after register:', error);
    }
  },
  refreshTokens: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) return false;
      const refreshed = await authApi.refresh({ refresh_token: refreshToken });
      const newIssuedAt = Date.now();
      await Promise.all([
        AsyncStorage.setItem(ASYNC_STORAGE_KEYS.ACCESS_TOKEN, refreshed.access_token),
        AsyncStorage.setItem(ASYNC_STORAGE_KEYS.REFRESH_TOKEN, refreshed.refresh_token),
        AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TOKEN_TYPE, refreshed.token_type),
        AsyncStorage.setItem(ASYNC_STORAGE_KEYS.EXPIRES_IN, String(refreshed.expires_in)),
        AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TOKEN_ISSUED_AT, String(newIssuedAt)),
      ]);
      set({
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        tokenType: refreshed.token_type,
        expiresIn: refreshed.expires_in,
        tokenIssuedAt: newIssuedAt,
        isAuthenticated: true,
      });
      return true;
    } catch (error) {
      console.warn('Failed to refresh token:', error);
      await Promise.all([
        AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.TOKEN_TYPE),
        AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.EXPIRES_IN),
        AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.TOKEN_ISSUED_AT),
        AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.NICKNAME),
        AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.PASSWORD_LENGTH),
      ]);
      set({
        accessToken: null,
        refreshToken: null,
        tokenType: null,
        expiresIn: null,
        nickname: null,
        tokenIssuedAt: null,
        passwordLength: null,
        isAuthenticated: false,
      });
      resetToLogin();
      return false;
    }
  },
  logout: async () => {
    const stateRefreshToken = get().refreshToken;
    const storedRefreshToken =
      stateRefreshToken ?? (await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.REFRESH_TOKEN));
    if (storedRefreshToken) {
      try {
        await authApi.logout({ refresh_token: storedRefreshToken });
      } catch (error) {
        console.warn('Failed to logout on server:', error);
      }
    }
    await useRegistrationStore.getState().resetRegistrationState();
    useSSEStore.getState().clearTimeline();
    set({
      accessToken: null,
      refreshToken: null,
      tokenType: null,
      expiresIn: null,
      nickname: null,
      tokenIssuedAt: null,
      passwordLength: null,
      isAuthenticated: false,
    });
  },
  withdraw: async () => {
    const token = get().accessToken;
    if (!token) {
      throw new Error('ACCESS_TOKEN_NOT_AVAILABLE');
    }
    await usersApi.deleteMe(token);
    await useAuthStore.getState().logout();
  },
  updateNickname: async (nickname: string) => {
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.NICKNAME, nickname);
    set({ nickname });
  },
}));

function parseNotes(notes: string | null | undefined): string[] | undefined {
  if (!notes) return undefined;
  const parsed = notes
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : undefined;
}

function getAgeInMonthsFromDateString(dateStr: string): number {
  const normalized = dateStr.replace(/-/g, '');
  const y = parseInt(normalized.slice(0, 4), 10);
  const m = parseInt(normalized.slice(4, 6), 10);
  const d = parseInt(normalized.slice(6, 8), 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return 0;
  const birth = new Date(y, m - 1, d);
  const today = new Date();
  return (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
}

function mapChildResponseToProfile(child: {
  id: number;
  name: string;
  birth: string;
  gender: 'M' | 'F';
  notes: string | null;
}) {
  return {
    childId: String(child.id),
    name: child.name,
    ageInMonths: getAgeInMonthsFromDateString(child.birth),
    gender: child.gender,
    notes: parseNotes(child.notes),
  };
}
