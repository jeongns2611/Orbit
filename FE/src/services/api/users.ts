import { apiRequest } from './client';

export interface UserMeResponse {
  id: number;
  email: string;
  nickname: string;
  name?: string | null;
  birth?: string | null;
  device_id?: number | null;
}

export interface DeviceLinkResponse {
  device_id: number;
  serial_no: string;
}

export async function deleteMe(accessToken: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>('/api/v1/app/users/me', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getMe(accessToken: string): Promise<UserMeResponse> {
  return apiRequest<UserMeResponse>('/api/v1/app/users/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export interface UserNicknameUpdateRequest {
  nickname: string;
}

export async function updateMe(
  accessToken: string,
  payload: UserNicknameUpdateRequest
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>('/api/v1/app/users/me', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ nickname: payload.nickname }),
  });
}

export async function linkDevice(accessToken: string, serialNo: string): Promise<DeviceLinkResponse> {
  return apiRequest<DeviceLinkResponse>('/api/v1/app/users/device', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ serial_no: serialNo }),
  });
}
