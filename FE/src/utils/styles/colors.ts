import { COLORS } from '@/constants';
import type { TextStyle, ViewStyle } from 'react-native';

// Background Colors
export const bgPrimary: ViewStyle = { backgroundColor: COLORS.primary };
export const bgSecondary: ViewStyle = { backgroundColor: COLORS.secondary };
export const bgBackground: ViewStyle = { backgroundColor: COLORS.background };
export const bgError: ViewStyle = { backgroundColor: COLORS.error };
export const bgSuccess: ViewStyle = { backgroundColor: COLORS.success };
export const bgWarning: ViewStyle = { backgroundColor: COLORS.warning };
export const bgTransparent: ViewStyle = { backgroundColor: 'transparent' };

// Text Colors
export const textPrimary: TextStyle = { color: COLORS.primary };
export const textSecondary: TextStyle = { color: COLORS.secondary };
export const textBackground: TextStyle = { color: COLORS.background };
export const textError: TextStyle = { color: COLORS.error };
export const textSuccess: TextStyle = { color: COLORS.success };
export const textWarning: TextStyle = { color: COLORS.warning };

// Border Colors
export const borderPrimary: ViewStyle = { borderColor: COLORS.primary };
export const borderSecondary: ViewStyle = { borderColor: COLORS.secondary };
export const borderError: ViewStyle = { borderColor: COLORS.error };
export const borderTransparent: ViewStyle = { borderColor: 'transparent' };

// 커스텀 색상 함수
export const bg = (color: string): ViewStyle => ({ backgroundColor: color });
export const textColor = (color: string): TextStyle => ({ color });
export const border = (color: string): ViewStyle => ({ borderColor: color });