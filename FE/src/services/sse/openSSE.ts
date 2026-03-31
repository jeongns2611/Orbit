import { parseSSEChunk, type ParsedSSEEvent } from './ParseSSE';

export interface OpenSSEOptions {
  /** Bearer 토큰 등. 있으면 Authorization: Bearer ${accessToken} 로 붙음 */
  accessToken?: string | null;
  /** 이벤트 하나 파싱될 때마다 호출 */
  onEvent: (event: ParsedSSEEvent) => void;
  /** 연결 실패/스트림 에러 시 (선택) */
  onError?: (error: Error) => void;
}

/**
 * SSE 스트림을 열고, 이벤트가 올 때마다 onEvent 콜백을 호출합니다.
 * URL이 비어 있으면 연결하지 않고 no-op cleanup을 반환합니다.
 * @returns 연결 끊는 함수 (컴포넌트 언마운트 시 호출)
 */
export function openSSE(
  url: string,
  options: OpenSSEOptions
): () => void {
  const { accessToken, onEvent, onError } = options;

  if (!url?.trim()) {
    return () => {};
  }

  const controller = new AbortController();
  const signal = controller.signal;

  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let buffer = '';

  fetch(url, {
    method: 'GET',
    headers,
    signal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`SSE ${response.status}: ${response.statusText}`);
      }
      const body = response.body;
      if (!body) {
        throw new Error('SSE response has no body');
      }
      const reader = body.getReader();
      const decoder = new TextDecoder();
      return readLoop(reader, decoder, (text) => {
        buffer += text;
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop() ?? '';
        const complete = parts.join('\n\n');
        if (complete) {
          const events = parseSSEChunk(complete);
          events.forEach(onEvent);
        }
      });
    })
    .then(() => {
      if (buffer.trim()) {
        const events = parseSSEChunk(buffer);
        events.forEach(onEvent);
      }
    })
    .catch((err) => {
      if (err?.name === 'AbortError') return;
      onError?.(err);
    });

  function cleanup() {
    controller.abort();
  }
  return cleanup;
}

function readLoop(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  onChunk: (text: string) => void
): Promise<void> {
  return reader.read().then(({ done, value }) => {
    if (done) return;
    if (value) onChunk(decoder.decode(value, { stream: true }));
    return readLoop(reader, decoder, onChunk);
  });
}