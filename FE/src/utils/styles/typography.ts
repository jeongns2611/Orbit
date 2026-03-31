import { SIZES } from '@/constants';
import type { TextStyle } from 'react-native';

// Font Size
export const fontSize = (size: number): TextStyle => ({ fontSize: size });
export const fs = fontSize; // alias

// Font Weight
export const fontWeight = {
  normal: { fontWeight: 'normal' as const },
  bold: { fontWeight: 'bold' as const },
  '100': { fontWeight: '100' as const },
  '200': { fontWeight: '200' as const },
  '300': { fontWeight: '300' as const },
  '400': { fontWeight: '400' as const },
  '500': { fontWeight: '500' as const },
  '600': { fontWeight: '600' as const },
  '700': { fontWeight: '700' as const },
  '800': { fontWeight: '800' as const },
  '900': { fontWeight: '900' as const },
};

// Text Align
export const textLeft: TextStyle = { textAlign: 'left' };
export const textCenter: TextStyle = { textAlign: 'center' };
export const textRight: TextStyle = { textAlign: 'right' };
export const textJustify: TextStyle = { textAlign: 'justify' };

// Text Decoration
export const underline: TextStyle = { textDecorationLine: 'underline' };
export const lineThrough: TextStyle = { textDecorationLine: 'line-through' };
export const noUnderline: TextStyle = { textDecorationLine: 'none' };

// Line Height
export const lineHeight = (value: number): TextStyle => ({ lineHeight: value });

// Letter Spacing
export const letterSpacing = (value: number): TextStyle => ({ letterSpacing: value });

// SIZES 기반 fontSize (반응형 적용 전용)
export const font = {
  small: (fontScale: (size: number) => number) => fontSize(fontScale(SIZES.fontSize.small)),
  medium: (fontScale: (size: number) => number) => fontSize(fontScale(SIZES.fontSize.medium)),
  large: (fontScale: (size: number) => number) => fontSize(fontScale(SIZES.fontSize.large)),
  xlarge: (fontScale: (size: number) => number) => fontSize(fontScale(SIZES.fontSize.xlarge)),
};