import { ENV } from '@/config';

export interface ApiError extends Error {
  status: number;
  data?: unknown;
}

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = ENV.API_BASE_URL;
  if (!baseUrl) {
    throw new Error('API_BASE_URL is not configured');
  }

  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data: unknown = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch (_) {
      data = null;
    }
  }

  if (!response.ok) {
    const error = new Error('API request failed') as ApiError;
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}
