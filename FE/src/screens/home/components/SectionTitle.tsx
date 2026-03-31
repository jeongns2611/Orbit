import { Text } from '@/components/common';
import { SIZES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { createResponsiveStyles, fontSize, mb } from '@/utils/styles';
import React from 'react';
import { View } from 'react-native';

interface SectionTitleProps {
  title: string;
  noMargin?: boolean;
}

export function SectionTitle({ title, noMargin }: SectionTitleProps) {
  const { scale, verticalScale, fontScale } = useResponsive();
  const { theme } = useTheme();

  const styles = createResponsiveStyles(
    {
      row: [
        {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          gap: scale(8),
        },
        ...(noMargin ? [] : [mb(scale(SIZES.spacing.md))]),
      ],
      bar: {
        width: 6,
        height: 16,
        backgroundColor: theme.sectionTitleBar,
        borderRadius: 4,
      },
      title: [
        fontSize(fontScale(SIZES.fontSize.large)),
        { color: theme.text },
      ],
    },
    { scale, verticalScale, fontScale }
  );

  return (
    <View style={styles.row}>
      <View style={styles.bar} />
      <Text style={styles.title} fontWeight="bold">
        {title}
      </Text>
    </View>
  );
}
