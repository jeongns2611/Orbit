const REAL_API_BASE_URL = process.env.REAL_API_BASE_URL || '';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || REAL_API_BASE_URL;
const SSE_DEVICE_STATUS_URL = `${API_BASE_URL.replace(/\/+$/, '')}/api/v1/app/sse`;

export const ENV = {
  API_BASE_URL, SSE_DEVICE_STATUS_URL
} as const;