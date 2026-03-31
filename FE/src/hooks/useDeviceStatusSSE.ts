import { ENV } from '@/config/env';
import type {
  SSEDeviceStatusPayload,
  SSETimelineImagePayload,
} from '@/services/sse';
import { parseSSEData } from '@/services/sse';
import type { DeviceStatus } from '@/store/registrationStore';
import { useRegistrationStore } from '@/store/registrationStore';
import { useEffect } from 'react';
import EventSource from 'react-native-sse';

interface UseDeviceStatusSSEOptions {
  onTimelineImage?: (payload: SSETimelineImagePayload) => void;
  onAuthError?: (error: unknown) => void;
}

const VALID_DRIVE_STATES = new Set<SSEDeviceStatusPayload['drive_state']>([
  'TRACKING',
  'HOLD_DECAY',
  'STOP',
]);

export function useDeviceStatusSSE(
  accessToken: string | null,
  options?: UseDeviceStatusSSEOptions
) {
  const setDeviceInfo = useRegistrationStore((s) => s.setDeviceInfo);
  const getDeviceInfo = useRegistrationStore.getState;

  useEffect(() => {
    const url = ENV.SSE_DEVICE_STATUS_URL?.trim();
    if (!url || !accessToken) return;

    let closed = false;
    const es = new EventSource(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const handleDeviceStatus: Parameters<EventSource['addEventListener']>[1] = (
      event
    ) => {
      if (!('data' in event) || typeof event.data !== 'string') return;
      const payload = parseSSEData<SSEDeviceStatusPayload>(event.data);
      if (!payload) return;

      const driveState = payload.drive_state;
      if (!VALID_DRIVE_STATES.has(driveState)) return;

      const prev = getDeviceInfo().deviceInfo;
      const next: DeviceStatus = prev
        ? {
            ...prev,
            driveState,
          }
        : {
            batteryPercent: 0,
            isOnline: true,
            driveState,
          };
      setDeviceInfo(next);
    };

    const handleTimelineImage: Parameters<EventSource['addEventListener']>[1] = (
      event
    ) => {
      if (!('data' in event) || typeof event.data !== 'string') return;
      const payload = parseSSEData<SSETimelineImagePayload>(event.data);
      if (!payload) return;
      if (
        typeof payload.id !== 'number' ||
        typeof payload.created_at !== 'string' ||
        typeof payload.short_result_text !== 'string'
      ) {
        return;
      }
      options?.onTimelineImage?.(payload);
    };

    es.addEventListener(
      'DEVICE_STATUS' as unknown as Parameters<EventSource['addEventListener']>[0],
      handleDeviceStatus
    );

    es.addEventListener(
      'IMAGE' as unknown as Parameters<EventSource['addEventListener']>[0],
      handleTimelineImage
    );
    es.addEventListener('error', (event) => {
      const status =
        (event as { status?: number | string })?.status ??
        (event as { data?: { status?: number | string } })?.data?.status ??
        (event as { message?: string })?.message;
      const isUnauthorized =
        status === 401 || (typeof status === 'string' && status.includes('401'));
      if (isUnauthorized && !closed) {
        closed = true;
        es.removeAllEventListeners();
        es.close();
        options?.onAuthError?.(event);
        return;
      }
      console.warn('[SSE] error', event);
    });

    return () => {
      closed = true;
      es.removeAllEventListeners();
      es.close();
    };
  }, [
    accessToken,
    setDeviceInfo,
    getDeviceInfo,
    options?.onTimelineImage,
    options?.onAuthError,
  ]);
}

