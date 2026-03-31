import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

type Style = ViewStyle | TextStyle | ImageStyle;
type ScaleFunction = (size: number) => number;
type ResponsiveStyleFunction = (
  scale: ScaleFunction,
  verticalScale: ScaleFunction,
  fontScale: ScaleFunction
) => Style;

type ResponsiveStyleValue = Style | ResponsiveStyleFunction | (Style | ResponsiveStyleFunction)[] | false | null | undefined;
type ResponsiveStylesObject = Record<string, ResponsiveStyleValue>;

type StyleValue = Style | Style[] | false | null | undefined;
type StylesObject = Record<string, StyleValue>;

type ResponsiveReturn = {
  scale: (size: number) => number;
  verticalScale: (size: number) => number;
  fontScale: (size: number) => number;
};

function isResponsiveStyleFunction(
  value: Style | ResponsiveStyleFunction
): value is ResponsiveStyleFunction {
  return typeof value === 'function';
}

/**
 * 반응형 스타일을 생성하는 함수
 * useResponsive 훅과 함께 사용
 * 
 * @example
 * const { scale, verticalScale, fontScale } = useResponsive();
 * const styles = createResponsiveStyles({
 *   container: [flex1, bgWhite],
 *   button: [center, h(scale(50)), br(scale(8))],
 * }, { scale, verticalScale, fontScale });
 */
export function createResponsiveStyles<T extends ResponsiveStylesObject>(
  styles: T,
  responsive?: ResponsiveReturn
): T {
  const processedStyles = Object.entries(styles).reduce((acc, [key, value]) => {
    if (!value) {
      acc[key] = value;
      return acc;
    }

    if (Array.isArray(value)) {
      acc[key] = value
        .filter((item): item is Style | ResponsiveStyleFunction => {
            if (item === null || item === undefined) return false;
            if (typeof item === 'boolean') return false;
            return typeof item === 'object' || typeof item === 'function';
        })
        .map(style => {
          if (isResponsiveStyleFunction(style) && responsive) {
            return style(responsive.scale, responsive.verticalScale, responsive.fontScale);
          }
          return style;
        });
    } else if (isResponsiveStyleFunction(value) && responsive) {
      acc[key] = value(responsive.scale, responsive.verticalScale, responsive.fontScale);
    } else {
      acc[key] = value;
    }

    return acc;
  }, {} as Record<string, unknown>);

  return StyleSheet.create(processedStyles as Record<string, Style | Style[]>) as T;
}

/**
 * 일반 스타일을 생성하는 함수 (반응형 없이)
 * 
 * @example
 * const styles = createStyles({
 *   container: [flex1, bgWhite],
 *   text: [textPrimary, fontSize(16)],
 * });
 */
export function createStyles<T extends StylesObject>(styles: T): T {
  const processedStyles = Object.entries(styles).reduce((acc, [key, value]) => {
    if (!value) {
      acc[key] = value;
      return acc;
    }

    if (Array.isArray(value)) {
      acc[key] = value.filter((item): item is Style => {
        if (item === null || item === undefined) return false;
        if (typeof item === 'function') return false;
        return true;
      });
    } else {
      acc[key] = value;
    }

    return acc;
  }, {} as Record<string, unknown>);

  return StyleSheet.create(processedStyles as Record<string, Style | Style[]>) as T;
}

/**
 * 조건부 스타일을 병합하는 헬퍼
 * 
 * @example
 * <View style={[styles.container, conditional(hasError, styles.error)]} />
 */
export function conditional<T extends Style>(
  condition: boolean,
  style: T
): T | null {
  return condition ? style : null;
}

/**
 * 여러 스타일을 안전하게 병합
 * 
 * @example
 * <View style={combineStyles(styles.base, styles.override, conditionalStyle)} />
 */
export function combineStyles(...styles: StyleValue[]): Style[] {
  return styles.filter((item): item is Style => {
    return item !== null && item !== undefined && item !== false && !Array.isArray(item);
  }) as Style[];
}