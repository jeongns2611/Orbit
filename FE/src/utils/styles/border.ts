import { SIZES } from '@/constants';
import type { ViewStyle } from 'react-native';

// Border Width
export const borderWidth = (value: number): ViewStyle => ({ borderWidth: value });
export const borderTopWidth = (value: number): ViewStyle => ({ borderTopWidth: value });
export const borderRightWidth = (value: number): ViewStyle => ({ borderRightWidth: value });
export const borderBottomWidth = (value: number): ViewStyle => ({ borderBottomWidth: value });
export const borderLeftWidth = (value: number): ViewStyle => ({ borderLeftWidth: value });

// Border Radius
export const borderRadius = (value: number): ViewStyle => ({ borderRadius: value });
export const borderTopLeftRadius = (value: number): ViewStyle => ({ borderTopLeftRadius: value });
export const borderTopRightRadius = (value: number): ViewStyle => ({ borderTopRightRadius: value });
export const borderBottomLeftRadius = (value: number): ViewStyle => ({ borderBottomLeftRadius: value });
export const borderBottomRightRadius = (value: number): ViewStyle => ({ borderBottomRightRadius: value });

// SIZES 기반 borderRadius
export const br = {
  sm: (scale: (size: number) => number) => borderRadius(scale(SIZES.borderRadius.sm)),
  md: (scale: (size: number) => number) => borderRadius(scale(SIZES.borderRadius.md)),
  lg: (scale: (size: number) => number) => borderRadius(scale(SIZES.borderRadius.lg)),
  xl: (scale: (size: number) => number) => borderRadius(scale(SIZES.borderRadius.xl)),
};

// Rounded
export const rounded = (value: number): ViewStyle => ({ borderRadius: value });
export const roundedFull: ViewStyle = { borderRadius: 9999 };