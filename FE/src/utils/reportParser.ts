/** 백엔드가 생성 실패 시 반환하는 문구. 이 경우 리포트 카드 디자인을 쓰지 않고 단순 안내만 표시 */
export const REPORT_ERROR_MESSAGES = [
  '기록이 없어 일일 리포트를 생성할 수 없습니다.',
  '일일 리포트 생성에 실패했습니다.',
] as const;

export function isReportErrorMessage(text: string | null): boolean {
  if (!text?.trim()) return false;
  const t = text.trim();
  return REPORT_ERROR_MESSAGES.some((msg) => t === msg);
}

export interface ParsedReportSection {
  title: string;
  content: string;
}

export function parseReportSections(reportText: string): ParsedReportSection[] {
  if (!reportText?.trim()) return [];

  const parts = reportText.trim().split(/\s*\[([^\]]+)\]\s*/).filter(Boolean);
  const sections: ParsedReportSection[] = [];

  for (let i = 0; i < parts.length; i += 2) {
    const title = parts[i]?.trim() ?? '';
    const content = (i + 1 < parts.length ? parts[i + 1] : '').trim();
    if (title) sections.push({ title, content });
  }

  return sections;
}

