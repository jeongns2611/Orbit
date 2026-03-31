import { apiRequest } from './client';

export interface ReportResponse {
  report_text: string;
}


export async function getReport(
  accessToken: string,
  date: string
): Promise<ReportResponse> {
  return apiRequest<ReportResponse>(
    `/api/v1/app/reports?date=${encodeURIComponent(date)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

/**
 * 데일리 리포트 생성 요청 (request body에 date 포함)
 * @param accessToken Bearer 토큰
 * @param date YYYY-MM-DD (없으면 오늘)
 */
export async function createReport(
  accessToken: string,
  date: string
): Promise<ReportResponse> {
  return apiRequest<ReportResponse>('/api/v1/app/reports', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ date }),
  });
}

export interface LatestImageResponse {
  url: string;
  key: string;
  timestamp: string;
}

export async function getLatestImage(
  accessToken: string,
  date?: string
): Promise<LatestImageResponse> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiRequest<LatestImageResponse>(
    `/api/v1/app/reports/latest-image${query}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}