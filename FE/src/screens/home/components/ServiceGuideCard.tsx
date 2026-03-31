import { Text } from '@/components/common';
import { SIZES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import {
  cardShadow,
  createResponsiveStyles,
  flexRow,
  fontSize,
  mb,
} from '@/utils/styles';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

export function ServiceGuideCard() {
  const { scale, verticalScale, fontScale } = useResponsive();
  const { theme } = useTheme();

  const styles = createResponsiveStyles(
    {
      card: [
        {
          backgroundColor: theme.backgroundCard,
          borderWidth: 1,
          borderColor: theme.cardBorder,
          borderRadius: scale(SIZES.borderRadius.lg),
          padding: scale(12),
          ...cardShadow,
        },
        mb(verticalScale(SIZES.spacing.lg)),
      ],
      content: [flexRow, { gap: scale(10), alignItems: 'center' }],
      iconContainer: [
        {
          width: scale(56),
          height: scale(56),
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
        },
      ],
      textContainer: [{ flex: 1 }],
      title: [
        fontSize(fontScale(SIZES.fontSize.medium)),
        { color: theme.text },
        mb(scale(10)),
      ],
      description: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: theme.text, lineHeight: fontScale(20) },
      ],
      highlight: [{ color: theme.accentBlue }],
    },
    { scale, verticalScale, fontScale }
  );
  
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="planet" size={scale(36)} color={theme.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} fontWeight="bold">아이라는 행성의 하루 궤적 🌍</Text>
          <Text style={styles.description}>
            기기와 프로필 설정을 완료하면{'\n'}
            <Text style={styles.highlight} fontWeight="semibold">탐사 일지</Text>와{' '}
            <Text style={styles.highlight} fontWeight="semibold">타임라인</Text>으로 아이의 하루를 기록합니다.
          </Text>
        </View>
      </View>
    </View>
  );
}