import { SIZES } from '@/constants';
import type { ViewStyle } from 'react-native';

// Padding
export const p = (value: number): ViewStyle => ({ padding: value });
export const px = (value: number): ViewStyle => ({ paddingHorizontal: value });
export const py = (value: number): ViewStyle => ({ paddingVertical: value });
export const pt = (value: number): ViewStyle => ({ paddingTop: value });
export const pr = (value: number): ViewStyle => ({ paddingRight: value });
export const pb = (value: number): ViewStyle => ({ paddingBottom: value });
export const pl = (value: number): ViewStyle => ({ paddingLeft: value });

// Margin
export const m = (value: number): ViewStyle => ({ margin: value });
export const mx = (value: number): ViewStyle => ({ marginHorizontal: value });
export const my = (value: number): ViewStyle => ({ marginVertical: value });
export const mt = (value: number): ViewStyle => ({ marginTop: value });
export const mr = (value: number): ViewStyle => ({ marginRight: value });
export const mb = (value: number): ViewStyle => ({ marginBottom: value });
export const ml = (value: number): ViewStyle => ({ marginLeft: value });

// Gap (React Native 0.71+)
export const gap = (value: number): ViewStyle => ({ gap: value });
export const rowGap = (value: number): ViewStyle => ({ rowGap: value });
export const columnGap = (value: number): ViewStyle => ({ columnGap: value });

// SIZES 기반 간격 (반응형 적용 전용)
export const spacing = {
  xs: (scale: (size: number) => number) => scale(SIZES.spacing.xs),
  sm: (scale: (size: number) => number) => scale(SIZES.spacing.sm),
  md: (scale: (size: number) => number) => scale(SIZES.spacing.md),
  lg: (scale: (size: number) => number) => scale(SIZES.spacing.lg),
  xl: (scale: (size: number) => number) => scale(SIZES.spacing.xl),
};