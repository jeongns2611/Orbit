import { FONTS } from '@/constants/fonts';
import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';

interface TextProps extends RNTextProps {
  fontWeight?: 'thin' | 'extraLight' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'extraBold' | 'black';
}

export function Text({ style, fontWeight = 'regular', ...props }: TextProps) {
  const fontFamily = FONTS[fontWeight] || FONTS.regular;

  return (
    <RNText
      style={[
        styles.default,
        { fontFamily },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  default: {},
});