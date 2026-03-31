import type { TextStyle, ViewStyle } from 'react-native';

// 반응형 스케일 함수 타입
type ScaleFunction = (size: number) => number;

// 반응형 크기 (scale 사용)
export const rs = (scale: ScaleFunction) => (size: number): ViewStyle => ({
  width: scale(size),
  height: scale(size),
});

// 반응형 width
export const rw = (scale: ScaleFunction) => (size: number): ViewStyle => ({
  width: scale(size),
});

// 반응형 height
export const rh = (scale: ScaleFunction) => (size: number): ViewStyle => ({
  height: scale(size),
});

// 반응형 padding
export const rp = (scale: ScaleFunction) => (size: number): ViewStyle => ({
  padding: scale(size),
});

export const rpx = (scale: ScaleFunction) => (size: number): ViewStyle => ({
  paddingHorizontal: scale(size),
});

export const rpy = (scale: ScaleFunction) => (size: number): ViewStyle => ({
  paddingVertical: scale(size),
});

// 반응형 margin
export const rm = (scale: ScaleFunction) => (size: number): ViewStyle => ({
  margin: scale(size),
});

export const rmx = (scale: ScaleFunction) => (size: number): ViewStyle => ({
  marginHorizontal: scale(size),
});

export const rmy = (scale: ScaleFunction) => (size: number): ViewStyle => ({
  marginVertical: scale(size),
});

// 반응형 vertical scale
export const rv = (verticalScale: ScaleFunction) => (size: number): ViewStyle => ({
  paddingTop: verticalScale(size),
  paddingBottom: verticalScale(size),
});

export const rvt = (verticalScale: ScaleFunction) => (size: number): ViewStyle => ({
  paddingTop: verticalScale(size),
});

export const rvb = (verticalScale: ScaleFunction) => (size: number): ViewStyle => ({
  paddingBottom: verticalScale(size),
});

// 반응형 font size
export const rf = (fontScale: ScaleFunction) => (size: number): TextStyle => ({
  fontSize: fontScale(size),
});

// 반응형 borderRadius
export const rbr = (scale: ScaleFunction) => (size: number): ViewStyle => ({
  borderRadius: scale(size),
});