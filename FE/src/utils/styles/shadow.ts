import type { ViewStyle } from 'react-native';

/** 카드용 부드러운 그림자 (참고 UI 스타일) - iOS shadow + Android elevation */
export const cardShadow: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 10,
  elevation: 3,
};
