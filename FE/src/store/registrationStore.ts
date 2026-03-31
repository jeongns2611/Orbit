import { ASYNC_STORAGE_KEYS } from "@/constants/keys";
import { childrenApi, devicesApi, usersApi } from "@/services";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface RegistrationState {
    deviceRegistered: boolean;
    childProfileRegistered: boolean;
    deviceInfo: DeviceStatus | null;
    childProfile: ChildProfile | null;
    setDeviceRegistered: (value: boolean) => void;
    setChildProfileRegistered: (value: boolean) => void;
    setDeviceInfo: (info: DeviceStatus|null) => void;
    setChildProfile: (profile: ChildProfile|null) => void;
    initializeRegistrationState: () => Promise<void>;
    syncDeviceRegisteredFromServer: (accessToken: string) => Promise<void>;
    syncChildProfileFromServer: (accessToken: string) => Promise<void>;
    resetRegistrationState: () => Promise<void>;
}

export interface DeviceStatus {
    batteryPercent: number;
    isOnline: boolean;
    driveState?: 'TRACKING' | 'HOLD_DECAY' | 'STOP';
    /** DB 저장용 */
    serial_no?: string;
    model_name?: string;
    firmware_version?: string;
}

export interface ChildProfile {
  childId: string;
  name: string;
  ageInMonths: number;
  /** 생년월일 8자리 (YYYYMMDD), 표시 시 점으로 파싱 */
  birthDate?: string;
  gender?: 'M' | 'F';
  profileImage?: string;
  notes?: string[];
}

export const useRegistrationStore = create<RegistrationState>((set, get) => ({
    deviceRegistered: false,
    childProfileRegistered: false,
    deviceInfo: null,
    childProfile: null,
    setDeviceRegistered: (value) => set({ deviceRegistered: value }),
    setChildProfileRegistered: (value) => set({ childProfileRegistered: value }),
    setDeviceInfo: (info) => set({ deviceInfo: info }),
    setChildProfile: (profile) => set({ childProfile: profile }),
    initializeRegistrationState: async () => {
        try {
            const [deviceValue, profileValue, deviceInfoStr, childProfileStr] = await Promise.all([
              AsyncStorage.getItem(ASYNC_STORAGE_KEYS.DEVICE_REGISTERED),
              AsyncStorage.getItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_REGISTERED),
              AsyncStorage.getItem(ASYNC_STORAGE_KEYS.DEVICE_INFO),
              AsyncStorage.getItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_DATA),
            ]);
            let deviceInfo: DeviceStatus | null = null;
            let childProfile: ChildProfile | null = null;
            if (deviceInfoStr) {
              try {
                deviceInfo = JSON.parse(deviceInfoStr) as DeviceStatus;
              } catch (_) {}
            }
            if (childProfileStr) {
              try {
                childProfile = JSON.parse(childProfileStr) as ChildProfile;
              } catch (_) {}
            }
            // 이미 스토어에 childProfile이 있으면 덮어쓰지 않음 → 수정 후 메인 복귀 시 반영 유지
            const currentChild = get().childProfile;
            set({
              deviceRegistered: deviceValue === 'true',
              childProfileRegistered: profileValue === 'true',
              deviceInfo,
              childProfile: currentChild != null ? currentChild : childProfile,
            });
          } catch (error) {
            console.error('Failed to load registration state:', error);
          }
        },
        syncDeviceRegisteredFromServer: async (accessToken: string) => {
          try {
              const profile = await usersApi.getMe(accessToken);
              const hasDevice = profile.device_id != null;
              set({ deviceRegistered: hasDevice });
              await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.DEVICE_REGISTERED, hasDevice ? 'true' : 'false');
      
              if (hasDevice && profile.device_id != null) {
                  try {
                      const deviceDetails = await devicesApi.getDevice(accessToken, profile.device_id);
                      const deviceInfo: DeviceStatus = {
                          batteryPercent: 100,
                          isOnline: true,
                          serial_no: deviceDetails.serial_no,
                          model_name: deviceDetails.model_name,
                          firmware_version: deviceDetails.firmware_version,
                      };
                      set({ deviceInfo });
                      await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.DEVICE_INFO, JSON.stringify(deviceInfo));
                  } catch (deviceError) {
                      console.warn('Failed to fetch device details:', deviceError);
                  }
              }
          } catch (error) {
              console.warn('Failed to sync device registration state:', error);
          }
      },
    syncChildProfileFromServer: async (accessToken: string) => {
        try {
            const child = await childrenApi.getChild(accessToken);
            const mapped = mapChildResponseToProfile(child);
            set({ childProfileRegistered: true, childProfile: mapped });
            await Promise.all([
                AsyncStorage.setItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_REGISTERED, 'true'),
                AsyncStorage.setItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_DATA, JSON.stringify(mapped)),
            ]);
        } catch (error) {
            const err = error as { status?: number; data?: unknown };
            const detail =
              err?.data && typeof err.data === 'object' && 'detail' in err.data
                ? (err.data as { detail?: string }).detail
                : null;
            if (err?.status === 404 || detail === 'Child not found') {
                set({ childProfileRegistered: false, childProfile: null });
                await Promise.all([
                    AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_REGISTERED),
                    AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_DATA),
                ]);
                return;
            }
            if (err?.status === 400 && detail === 'Device not linked') {
                set({ childProfileRegistered: false, childProfile: null });
                await Promise.all([
                    AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_REGISTERED),
                    AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_DATA),
                ]);
                return;
            }
            console.warn('Failed to sync child profile:', error);
        }
    },
    resetRegistrationState: async () => {
        try {
            const allKeys = Object.values(ASYNC_STORAGE_KEYS);
            await AsyncStorage.multiRemove(allKeys);
            set({
                deviceRegistered: false,
                childProfileRegistered: false,
                deviceInfo: null,
                childProfile: null,
            });
        } catch (error) {
            console.error('Failed to reset registration state:', error);
        }
    },
}));

function parseNotes(notes: string | null | undefined): string[] | undefined {
  if (!notes) return undefined;
  const parsed = notes
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : undefined;
}

function mapChildResponseToProfile(child: {
  id: number;
  name: string;
  birth: string;
  gender: 'M' | 'F';
  notes: string | null;
}): ChildProfile {
  return {
    childId: String(child.id),
    name: child.name,
    ageInMonths: getAgeInMonthsFromDateString(child.birth),
    birthDate: child.birth ? child.birth.replace(/-/g, '') : undefined,
    gender: child.gender,
    notes: parseNotes(child.notes),
  };
}

function getAgeInMonthsFromDateString(dateStr: string): number {
  const normalized = dateStr.replace(/-/g, '');
  const y = parseInt(normalized.slice(0, 4), 10);
  const m = parseInt(normalized.slice(4, 6), 10);
  const d = parseInt(normalized.slice(6, 8), 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return 0;
  const birth = new Date(y, m - 1, d);
  const today = new Date();
  return (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
}
