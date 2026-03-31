import { Text } from '@/components/common';
import { SIZES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import {
  createResponsiveStyles,
  fontSize,
  mb,
  mt,
} from '@/utils/styles';
import React from 'react';
import { View } from 'react-native';

interface HomeHeaderProps {
  nickname: string;
  hasDevice?: boolean;
  hasChildProfile?: boolean;
}


export function HomeHeader({ nickname, hasDevice: _hasDevice, hasChildProfile: _hasChildProfile }: HomeHeaderProps) {
  const { scale, verticalScale, fontScale } = useResponsive();
  const { theme } = useTheme();

  const styles = createResponsiveStyles(
    {
      header: [
        { paddingTop: 48, paddingHorizontal: 0 },
        mb(verticalScale(SIZES.spacing.xl)),
      ],
      welcomeRow: [
        { flexDirection: 'row' as const, flexWrap: 'wrap' as const, alignItems: 'baseline' as const },
        mb(scale(4)),
      ],
      welcomeText: [
        fontSize(fontScale(22)),
        { color: theme.text, letterSpacing: -0.5 },
      ],
      nicknameUnderlineWrap: {
        borderBottomWidth: 2,
        borderBottomColor: theme.primary,
        alignSelf: 'flex-start' as const,
      },
      nicknameText: [
        fontSize(fontScale(22)),
        { color: theme.text, letterSpacing: -0.5 },
      ],
      subtitleText: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: theme.textSecondary },
        mt(scale(4)),
      ],
    },
    { scale, verticalScale, fontScale }
  );

  return (
    <View style={styles.header}>
      <View style={styles.welcomeRow}>
        <Text style={styles.welcomeText} fontWeight="bold">안녕하세요, </Text>
        <View style={styles.nicknameUnderlineWrap}>
          <Text style={styles.nicknameText} fontWeight="bold">{nickname}님</Text>
        </View>
      </View>
      <Text style={styles.subtitleText}>오늘의 우주 탐사는 순항 중입니다.</Text>
    </View>
  );
}