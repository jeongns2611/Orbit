import { Text } from '@/components/common';
import { SIZES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { fontSize } from '@/utils/styles';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StatusBar, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenHeaderProps = {
  title: string;
  onBack: () => void;
  insetByParent?: boolean;
};

export function ScreenHeader({ title, onBack, insetByParent = false }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top || (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);
  const { scale, fontScale } = useResponsive();
  const { theme } = useTheme();

  const headerHeight = scale(40);
  const paddingBottom = scale(16);
  const paddingHorizontal = scale(16);
  const paddingLeft = insetByParent ? paddingHorizontal : insets.left + paddingHorizontal;
  const paddingRight = insetByParent ? paddingHorizontal : insets.right + paddingHorizontal;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: topInset,
        paddingBottom,
        paddingLeft,
        paddingRight,
        backgroundColor: theme.background + 'E6',
        borderBottomWidth: 1,
        borderBottomColor: theme.cardBorder,
      }}
    >
      <TouchableOpacity
        style={{
          width: headerHeight,
          height: headerHeight,
          borderRadius: headerHeight / 2,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={scale(24)} color={theme.primary} />
      </TouchableOpacity>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          style={[
            fontSize(fontScale(SIZES.fontSize.xlarge)),
            { color: theme.text, fontWeight: 'bold' },
          ]}
        >
          {title}
        </Text>
      </View>

      <View style={{ width: headerHeight, height: headerHeight }} />
    </View>
  );
}