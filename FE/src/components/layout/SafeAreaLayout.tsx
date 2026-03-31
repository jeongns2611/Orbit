import React, { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/constants';

interface SafeAreaLayoutProps {
  children: ReactNode;
  backgroundColor?: string;
}

/**
 * Android SafeArea를 처리하는 레이아웃 컴포넌트
 * - StatusBar 영역을 고려한 SafeAreaView
 * - Android 노치/상태바 대응
 */
export function SafeAreaLayout({
  children,
  backgroundColor = COLORS.background,
}: SafeAreaLayoutProps) {
  return (
    <>
      <StatusBar style="dark" backgroundColor={backgroundColor} />
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        {children}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
