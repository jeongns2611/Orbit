import React, { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { SIZES } from '@/constants';

interface ContainerLayoutProps {
  children: ReactNode;
  padding?: keyof typeof SIZES.spacing;
  backgroundColor?: string;
}

/**
 * 공통 컨테이너 레이아웃 컴포넌트
 * - 화면별 일관된 패딩 적용
 * - Android Material Design 가이드라인 고려
 */
export function ContainerLayout({
  children,
  padding = 'md',
  backgroundColor,
}: ContainerLayoutProps) {
  return (
    <View
      style={[
        styles.container,
        { padding: SIZES.spacing[padding] },
        backgroundColor && { backgroundColor },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
