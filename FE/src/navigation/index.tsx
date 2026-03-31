import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { navigationRef } from './rootNavigation';
import type { RootStackParamList } from './types';
import { MainTabNavigator } from './stacks/MainTabNavigator';
import { useDeviceStatusSSE } from '@/hooks';
import type { SSETimelineImagePayload } from '@/services/sse';
import { 
  LoginScreen, 
  RegisterScreen,
  DeviceRegistrationScreen,
  ChildProfileScreen,
  MyPageScreen,
  PasswordReconfirmScreen,
} from '@/screens';
import { ROUTES } from '@/constants';
import { useAuthStore, useSSEStore } from '@/store';
import { useRegistrationStore } from '@/store/registrationStore';

const Stack = createStackNavigator<RootStackParamList>();

export { resetToLogin } from './rootNavigation';

export function AppNavigator() {
  const {
    isAuthenticated,
    hasHydrated,
    accessToken,
    tokenIssuedAt,
    expiresIn,
    refreshTokens,
  } = useAuthStore();
  const deviceRegistered = useRegistrationStore((s) => s.deviceRegistered);
  const prependTimelineEvent = useSSEStore((s) => s.prependTimelineEvent);
  const [tokenReady, setTokenReady] = useState(false);
  const refreshingRef = useRef(false);

  const handleTimelineImage = useCallback((payload: SSETimelineImagePayload) => {
    const nextEvent = {
      hour: formatTimelineHour(payload.created_at),
      text: payload.short_result_text,
    };
    prependTimelineEvent(nextEvent);
  }, [prependTimelineEvent]);

  useEffect(() => {
    let cancelled = false;

    async function ensureValidToken() {
      if (!hasHydrated || !isAuthenticated || !accessToken) {
        if (!cancelled) setTokenReady(false);
        return;
      }
      const needsRefresh =
        tokenIssuedAt != null &&
        expiresIn != null &&
        Date.now() >= tokenIssuedAt + Math.max(expiresIn - 60, 0) * 1000;

      if (!needsRefresh) {
        if (!cancelled) setTokenReady(true);
        return;
      }
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      try {
        const ok = await refreshTokens();
        if (!cancelled) setTokenReady(ok);
      } finally {
        refreshingRef.current = false;
      }
    }

    ensureValidToken();
    return () => {
      cancelled = true;
    };
  }, [
    hasHydrated,
    isAuthenticated,
    accessToken,
    tokenIssuedAt,
    expiresIn,
    refreshTokens,
  ]);

  const handleAuthError = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setTokenReady(false);
    try {
      const ok = await refreshTokens();
      setTokenReady(ok);
    } finally {
      refreshingRef.current = false;
    }
  }, [refreshTokens]);

  const sseAccessToken =
    isAuthenticated && deviceRegistered && tokenReady ? accessToken : null;
  useDeviceStatusSSE(sseAccessToken, {
    onTimelineImage: handleTimelineImage,
    onAuthError: handleAuthError,
  });

  if (!hasHydrated) {
    return null;
  }
  return (
    <NavigationContainer ref={navigationRef}>

      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={isAuthenticated ? 'MainTabs' : ROUTES.LOGIN}
      >
        <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
        <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
        <Stack.Screen name={ROUTES.DEVICE_REGISTRATION} component={DeviceRegistrationScreen} />
        <Stack.Screen name={ROUTES.CHILD_PROFILE} component={ChildProfileScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name={ROUTES.PASSWORD_RECONFIRM} component={PasswordReconfirmScreen} />
        <Stack.Screen name={ROUTES.MY_PAGE} component={MyPageScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function formatTimelineHour(isoDatetime: string): string {
  const date = new Date(isoDatetime);
  if (Number.isNaN(date.getTime())) return '';
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 || 12;
  return `${period} ${hour12}:${String(m).padStart(2, '0')}`;
}
