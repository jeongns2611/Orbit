import { COLORS, SIZES } from '@/constants';
import { useResponsive } from '@/hooks/useResponsive';
import {
    bgPrimary,
    bgSecondary,
    bgTransparent,
    borderPrimary,
    borderRadius,
    borderWidth,
    center,
    createResponsiveStyles,
    fontSize,
    fontWeight,
    h,
    mb,
    textBackground,
    textPrimary,
} from '@/utils/styles';
import React from 'react';
import { ActivityIndicator, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from './Text';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const { scale, verticalScale, fontScale } = useResponsive();
  const isDisabled = disabled || loading;

  const styles = createResponsiveStyles(
    {
      button: [
        h(scale(SIZES.buttonHeight)),
        borderRadius(scale(SIZES.borderRadius.md)),
        center,
        mb(scale(SIZES.spacing.xs)),
      ],
      primary: [bgPrimary],
      secondary: [bgSecondary],
      outline: [
        bgTransparent, 
        borderWidth(scale(2)), 
        borderPrimary
      ],
      disabled: [{ opacity: 0.5 }],
      text: [
        fontSize(fontScale(SIZES.fontSize.large)), 
        fontWeight['600']
      ],
      primaryText: [textBackground],
      secondaryText: [textBackground],
      outlineText: [textPrimary],
    },
    { scale, verticalScale, fontScale }
  );

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? COLORS.primary : COLORS.background} />
      ) : (
        <Text 
          style={[styles.text, styles[`${variant}Text`], textStyle]} 
          fontWeight="semibold"
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}