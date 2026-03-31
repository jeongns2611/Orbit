import type { DimensionValue, ViewStyle } from 'react-native';

// Width
export const w = (value: DimensionValue): ViewStyle => ({ width: value });
export const wFull: ViewStyle = { width: '100%' };
export const wAuto: ViewStyle = { width: 'auto' };

// Height
export const h = (value: DimensionValue): ViewStyle => ({ height: value });
export const hFull: ViewStyle = { height: '100%' };
export const hAuto: ViewStyle = { height: 'auto' };

// Min/Max Width
export const minW = (value: DimensionValue): ViewStyle => ({ minWidth: value });
export const maxW = (value: DimensionValue): ViewStyle => ({ maxWidth: value });

// Min/Max Height
export const minH = (value: DimensionValue): ViewStyle => ({ minHeight: value });
export const maxH = (value: DimensionValue): ViewStyle => ({ maxHeight: value });

// Aspect Ratio
export const aspectRatio = (value: number): ViewStyle => ({ aspectRatio: value });