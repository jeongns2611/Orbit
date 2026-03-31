export const FONTS = {
  thin: 'Pretendard-Thin',
  extraLight: 'Pretendard-ExtraLight',
  light: 'Pretendard-Light',
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  extraBold: 'Pretendard-ExtraBold',
  black: 'Pretendard-Black',
  /** 탐사 일지 알림장용 (GangwonEduSaeeum, App.tsx에서 웹 CDN으로 로드) */
  reportHandwriting: 'GangwonEduSaeeum',
  /** 탐사 일지 폰트 미로드 시 항상 보이도록 사용 */
  reportFallback: 'Pretendard-Regular',
} as const;