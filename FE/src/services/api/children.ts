import { apiRequest } from './client';

export interface ChildCreateRequest {
  name: string;
  birth: string; // YYYY-MM-DD
  gender: 'M' | 'F';
  notes?: string | null;
}

export interface ChildResponse {
  id: number;
  device_id: number | null;
  name: string;
  birth: string; // YYYY-MM-DD
  gender: 'M' | 'F';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function createChild(
  accessToken: string,
  payload: ChildCreateRequest
): Promise<ChildResponse> {
  return apiRequest<ChildResponse>('/api/v1/app/children', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function getChild(accessToken: string): Promise<ChildResponse> {
  return apiRequest<ChildResponse>('/api/v1/app/children', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export interface ChildNotesUpdateRequest {
  notes: string | null;
}

export async function updateChildNotes(
  accessToken: string,
  payload: ChildNotesUpdateRequest
): Promise<ChildResponse> {
  return apiRequest<ChildResponse>('/api/v1/app/children', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ notes: payload.notes }),
  });
}
