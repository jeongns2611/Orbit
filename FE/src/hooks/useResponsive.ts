import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;
const MAX_SCALE = 1.0;
const MIN_SCALE = 0.8;
/** 웹에서 넓은 창에 맞춰 확대되지 않도록 스케일 계산에 쓸 최대 너비 */
const WEB_MAX_WIDTH = 428;

export function useResponsive() {
  const dimensions = useWindowDimensions();

  const width = dimensions.width || BASE_WIDTH;
  const height = dimensions.height || BASE_HEIGHT;
  const effectiveWidth = Platform.OS === 'web' ? Math.min(width, WEB_MAX_WIDTH) : width;
  const effectiveHeight = Platform.OS === 'web' ? Math.min(height, 926) : height;

  return useMemo(() => {
    const scaleRatio = effectiveWidth / BASE_WIDTH;
    const verticalScaleRatio = effectiveHeight / BASE_HEIGHT;
    
    // 스케일 비율 제한
    const limitedScaleRatio = Math.max(MIN_SCALE, Math.min(scaleRatio, MAX_SCALE));
    const limitedVerticalScaleRatio = Math.max(MIN_SCALE, Math.min(verticalScaleRatio, MAX_SCALE));
    
    const scale = (size: number): number => size * limitedScaleRatio;
    
    const verticalScale = (size: number): number => size * limitedVerticalScaleRatio;
    
    const fontScale = (size: number): number => {
      const scaledSize = size * limitedScaleRatio;
      return Math.max(size * 0.8, Math.min(scaledSize, size * 1.2));
    };

    return {
      scale,
      verticalScale,
      fontScale,
      width,
      height,
      spacing: {
        xs: scale(4),
        sm: scale(8),
        md: scale(16),
        lg: scale(24),
        xl: scale(32),
      },
      borderRadius: {
        sm: scale(4),
        md: scale(8),
        lg: scale(12),
        xl: scale(16),
      },
      fontSize: {
        small: fontScale(12),
        medium: fontScale(14),
        large: fontScale(16),
        xlarge: fontScale(20),
      },
      buttonHeight: scale(50),
    };
  }, [effectiveWidth, effectiveHeight, width, height]);
}