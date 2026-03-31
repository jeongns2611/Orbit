import { apiRequest } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
  name?: string | null;
  birth?: string | null;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token: string;
}

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/api/v1/app/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function register(payload: RegisterRequest): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/api/v1/app/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function refresh(payload: RefreshRequest): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/api/v1/app/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logout(payload: LogoutRequest): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>('/api/v1/app/auth/logout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface PasswordVerifyResponse {
  ok: boolean;
}

export async function verifyPassword(
  password: string,
  accessToken: string
): Promise<PasswordVerifyResponse> {
  return apiRequest<PasswordVerifyResponse>('/api/v1/app/auth/password', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ password }),
  });
}