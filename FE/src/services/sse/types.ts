export type DriveState = 'TRACKING' | 'HOLD_DECAY' | 'STOP';

export interface SSEDeviceStatusPayload {
  drive_state: DriveState;
}

export interface SSETimelineImagePayload {
  id: number;
  created_at: string;
  short_result_text: string;
}

export interface SSEEventMap {
  device_status: SSEDeviceStatusPayload;
  TIMELINE_IMAGE: SSETimelineImagePayload;
}

export type SSEEventType = keyof SSEEventMap;
