import { darkTheme } from '@/constants/themeColors';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppNavigator } from '@/navigation';
import { SplashScreen } from '@/screens';
import { useAuthStore } from '@/store';
import { useThemeStore } from '@/store/themeStore';
import { useFonts } from 'expo-font';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { Appearance, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
const WEB_APP_MAX_WIDTH = 428;

// Pretendard (로컬 OTF — expo-font가 웹/네이티브에서 안정적으로 적용)
function getPretendardFonts(): Record<string, unknown> {
  return {
    'Pretendard-Thin': require('@/assets/fonts/Pretendard-Thin.otf'),
    'Pretendard-ExtraLight': require('@/assets/fonts/Pretendard-ExtraLight.otf'),
    'Pretendard-Light': require('@/assets/fonts/Pretendard-Light.otf'),
    'Pretendard-Regular': require('@/assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('@/assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('@/assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('@/assets/fonts/Pretendard-Bold.otf'),
    'Pretendard-ExtraBold': require('@/assets/fonts/Pretendard-ExtraBold.otf'),
    'Pretendard-Black': require('@/assets/fonts/Pretendard-Black.otf'),
  };
}

// 손글씨 폰트는 패키지 미설치/로드 실패 시 앱이 멈추지 않도록 선택적 로드
function getHandwritingFonts(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- 선택적 폰트 패키지
    const nanumModule = require('@expo-google-fonts/nanum-pen-script');
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- 선택적 폰트 패키지
    const gamjaModule = require('@expo-google-fonts/gamja-flower');
    if (nanumModule?.NanumPenScript_400Regular) out.NanumPenScript_400Regular = nanumModule.NanumPenScript_400Regular;
    if (gamjaModule?.GamjaFlower_400Regular) out.GamjaFlower_400Regular = gamjaModule.GamjaFlower_400Regular;
  } catch {
    // 패키지 없거나 로드 실패 시 무시
  }
  return out;
}

// 탐사 일지용 GangwonEduSaeeum (웹: CDN woff 사용 시 OTS 에러 회피, 네이티브: 로컬 TTF)
const GANGWON_CDN_URL =
  'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2201-2@1.0/GangwonEduSaeeum_OTFMediumA.woff';

function getGangwonFont(): Record<string, unknown> {
  if (Platform.OS === 'web') {
    return {};
  }
  return {
    GangwonEduSaeeum: require('@/assets/fonts/GangwonEduSaeeum_OTFMediumA.ttf'),
  };
}

// 앱이 준비될 때까지 스플래시 화면 유지
ExpoSplashScreen.preventAutoHideAsync();

export default function App() {
  const { width: windowWidth } = useWindowDimensions();
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateRef = React.useRef(hydrate);
  hydrateRef.current = hydrate;

  const [fontsLoaded, fontError] = useFonts({
    ...getPretendardFonts(),
    ...getHandwritingFonts(),
    ...getGangwonFont(),
  });

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      useThemeStore.setState({ systemColorScheme: colorScheme });
    });
    return () => sub.remove();
  }, []);
  
  useEffect(() => {
    if (fontError) setIsReady(true);
  }, [fontError]);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      try {
        if (fontsLoaded) {
          // 최소 스플래시 표시 시간
          await new Promise(resolve => setTimeout(resolve, 2000));

          // 웹 환경: GangwonEduSaeeum CDN woff 로드 (로컬 OTF/TTF는 OTS 에러 발생)
          if (Platform.OS === 'web' && typeof document !== 'undefined') {
            try {
              const gangwonFace = new FontFace(
                'GangwonEduSaeeum',
                `url(${GANGWON_CDN_URL}) format('woff')`
              );
              (document.fonts as unknown as { add: (f: FontFace) => void }).add(gangwonFace);
              await gangwonFace.load();
            } catch (e) {
              console.warn('GangwonEduSaeeum CDN load failed:', e);
            }
            try {
              await document.fonts.ready;
              await new Promise(resolve => setTimeout(resolve, 300));
            } catch {
              // 무시
            }
          } else {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          await hydrateRef.current();
          await useThemeStore.getState().hydrate();
          if (!cancelled) setIsReady(true);
        }
      } catch (e) {
        console.warn('Error during app preparation:', e);
        if (!cancelled) setIsReady(true);
      }
    }

    prepare();

    // 에뮬/기기에서 폰트 로딩이 멈춰도 최대 6초 후에는 화면 표시
    const timeout = setTimeout(async () => {
      if (!cancelled) {
        try {
          await hydrateRef.current();
          await useThemeStore.getState().hydrate();
        } catch (_e) {
          // 무시
        }
        setIsReady(true);
      }
    }, 6000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(async () => {
    if (isReady) {
      try {
        await ExpoSplashScreen.hideAsync();
      } catch (e) {
        console.warn('Error hiding splash screen:', e);
      }
    }
  }, [isReady]);

  // 폰트 로딩 중이거나 준비가 안 됐으면 스플래시 (타임아웃/폰트 실패 시 isReady만으로도 앱 표시)
  const canShowApp = (fontsLoaded && isReady) || fontError || isReady;
  if (!canShowApp) {
    return (
      <View style={styles.container}>
        <SplashScreen splashBackgroundColor={darkTheme.background} />
        <StatusBar hidden />
      </View>
    );
  }

  const isWeb = Platform.OS === 'web';
  const appWidth = isWeb ? Math.min(windowWidth, WEB_APP_MAX_WIDTH) : undefined;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <View
          style={[
            styles.container,
            styles.appContainer,
            isWeb && styles.containerWeb,
          ]}
          onLayout={onLayoutRootView}
        >
          <View style={[styles.inner, isWeb && appWidth != null && { width: appWidth }]}>
            <AppNavigator />
          </View>
          <StatusBar style="auto" />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appContainer: {
    backgroundColor: darkTheme.background,
  },
  containerWeb: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: WEB_APP_MAX_WIDTH,
  },
});
