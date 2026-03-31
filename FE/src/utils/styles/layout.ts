import type { ViewStyle } from 'react-native';

export const flex1: ViewStyle = { flex: 1 };
export const flexGrow: ViewStyle = { flexGrow: 1 };
export const flexShrink: ViewStyle = { flexShrink: 1 };
export const flexNone: ViewStyle = { flex: 0 };

export const flexRow: ViewStyle = { flexDirection: 'row' };
export const flexColumn: ViewStyle = { flexDirection: 'column' };
export const flexRowReverse: ViewStyle = { flexDirection: 'row-reverse' };
export const flexColumnReverse: ViewStyle = { flexDirection: 'column-reverse' };

export const justifyStart: ViewStyle = { justifyContent: 'flex-start' };
export const justifyEnd: ViewStyle = { justifyContent: 'flex-end' };
export const justifyCenter: ViewStyle = { justifyContent: 'center' };
export const justifyBetween: ViewStyle = { justifyContent: 'space-between' };
export const justifyAround: ViewStyle = { justifyContent: 'space-around' };
export const justifyEvenly: ViewStyle = { justifyContent: 'space-evenly' };

export const alignStart: ViewStyle = { alignItems: 'flex-start' };
export const alignEnd: ViewStyle = { alignItems: 'flex-end' };
export const alignCenter: ViewStyle = { alignItems: 'center' };
export const alignStretch: ViewStyle = { alignItems: 'stretch' };
export const alignBaseline: ViewStyle = { alignItems: 'baseline' };

export const alignSelfStart: ViewStyle = { alignSelf: 'flex-start' };
export const alignSelfEnd: ViewStyle = { alignSelf: 'flex-end' };
export const alignSelfCenter: ViewStyle = { alignSelf: 'center' };
export const alignSelfStretch: ViewStyle = { alignSelf: 'stretch' };

export const center: ViewStyle = {
  justifyContent: 'center',
  alignItems: 'center',
};

export const centerRow: ViewStyle = {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
};

export const centerColumn: ViewStyle = {
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
};

export const spaceBetween: ViewStyle = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
};

export const spaceAround: ViewStyle = {
  flexDirection: 'row',
  justifyContent: 'space-around',
  alignItems: 'center',
};

export const relative: ViewStyle = { position: 'relative' };
export const absolute: ViewStyle = { position: 'absolute' };

export const position = {
  top: (value: number): ViewStyle => ({ top: value }),
  right: (value: number): ViewStyle => ({ right: value }),
  bottom: (value: number): ViewStyle => ({ bottom: value }),
  left: (value: number): ViewStyle => ({ left: value }),
};

export const wrap: ViewStyle = { flexWrap: 'wrap' };
export const nowrap: ViewStyle = { flexWrap: 'nowrap' };