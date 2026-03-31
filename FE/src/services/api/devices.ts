import { apiRequest } from "./client";

export interface DeviceCreateRequest {
    serial_no: string;
    model_name: string;
    firmware_version: string;
  }
  
  export async function createDevice(
    accessToken: string,
    payload: DeviceCreateRequest,
  ): Promise<DeviceReadResponse> {
    return apiRequest<DeviceReadResponse>('/api/v1/app/devices', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

export interface DeviceReadResponse {
    id: number;
    serial_no: string;
    model_name: string;
    firmware_version: string;
}

export async function getDevice(
    accessToken: string,
    deviceId: number,
): Promise<DeviceReadResponse> {
    return apiRequest<DeviceReadResponse>(`/api/v1/app/devices/${deviceId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });
}