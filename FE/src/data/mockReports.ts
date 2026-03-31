import { format } from 'date-fns';

export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export interface ReportData {
  report: string;
}

const TODAY_REPORT = `[오늘의 한 줄 요약]
성준이는 AI와 함께 곰돌이 인형과의 모험, 공룡과의 싸움, 보물섬 탐험 등 다양한 상상을 하며 즐거운 시간을 보냈습니다.

[오늘의 놀이/대화 요약]
- 곰돌이 인형과 산, 바다, 놀이공원에서 모험을 했다고 이야기했습니다.
- 티라노사우르스와의 싸움을 상상하며 망토와 칼을 언급했습니다.
- AI와 함께 보물섬 해적이 되어 보석을 찾는 모험을 했습니다.

[아이의 감정/안정 상태]
- 다양한 모험 이야기를 하며 즐거워했습니다.
- 무서운 상황(해골)에 두려움을 느끼기도 했지만, AI의 격려에 안정을 찾았습니다.

[관심사/선호/키워드]
- 곰돌이 인형
- 공룡 (티라노사우르스)
- 모험, 보물, 해적, 보석
- 엄마

[부모를 위한 대화 제안]
- 아이가 오늘 나눈 모험 이야기를 함께 나누며 공감해주시면 좋습니다.
- 아이가 좋아하는 공룡, 보물, 해적 등의 주제로 함께 책을 읽거나 놀이를 해보는 것도 좋은 방법입니다.
- 아이가 두려움을 느꼈던 상황에 대해 이야기를 나누며, 아이의 감정을 이해하고 지지해주세요.`;

/** 홈·리포트 탭 공용. 당일 리포트 목업. */
export function getMockReports(): Record<string, ReportData> {
  const todayKey = formatDateKey(new Date());
  return {
    [todayKey]: {
      report: TODAY_REPORT,
    },
  };
}
