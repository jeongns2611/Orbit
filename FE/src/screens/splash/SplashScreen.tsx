import { COLORS } from '@/constants';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface SplashScreenProps {
  splashBackgroundColor?: string;
  logoWidth?: number;
  logoHeight?: number;
}

/**
 * 커스텀 스플래시 스크린 컴포넌트
 * - 배경색 커스터마이징 가능
 * - PNG 로고 지원
 * - 전체 화면을 채우는 스플래시 화면
 */
export function SplashScreen({
  splashBackgroundColor = COLORS.splashBackground,
  logoWidth = 400,
  logoHeight = 400,
}: SplashScreenProps) {
  return (
    <View style={[styles.container, { backgroundColor: splashBackgroundColor }]}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/logo.png')}
          style={[styles.logo, { width: logoWidth, height: logoHeight }]}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {},
});
