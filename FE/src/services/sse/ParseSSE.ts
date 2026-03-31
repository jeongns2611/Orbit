export interface ParsedSSEEvent {
    event: string;
    data: string;
  }
  
  /**
   * SSE 청크(여러 줄 문자열)를 파싱해 event/data 쌍 배열로 반환.
   * 빈 줄이 나오면 그때까지 모은 것이 한 이벤트.
   */
  export function parseSSEChunk(chunk: string): ParsedSSEEvent[] {
    const lines = chunk.split(/\r?\n/);
    const results: ParsedSSEEvent[] = [];
    let current: Partial<ParsedSSEEvent> = {};
    const dataLines: string[] = [];
  
    for (const line of lines) {
      if (line.startsWith('event:')) {
        current.event = line.slice(6).trim();
        continue;
      }
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
        continue;
      }
      if (line === '') {
        if (current.event !== undefined || dataLines.length > 0) {
          results.push({
            event: current.event ?? 'message',
            data: dataLines.join('\n'),
          });
        }
        current = {};
        dataLines.length = 0;
      }
    }
  
    // 마지막에 빈 줄 없이 끝난 경우
    if (current.event !== undefined || dataLines.length > 0) {
      results.push({
        event: current.event ?? 'message',
        data: dataLines.join('\n'),
      });
    }
  
    return results;
  }
  
  /**
   * JSON data 필드를 파싱. 실패 시 null.
   */
  export function parseSSEData<T>(data: string): T | null {
    if (!data.trim()) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }