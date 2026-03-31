import { ASYNC_STORAGE_KEYS } from '@/constants/keys';
import type { TimelineEvent } from '@/store/sseStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = ASYNC_STORAGE_KEYS.TIMELINE_BY_DATE;
const MAX_PER_DATE = 10;

type TimelineByDateState = {
  timelineByDate: Record<string, TimelineEvent[]>;
  setTimelineForDate: (dateKey: string, events: TimelineEvent[]) => void;
  getTimelineForDate: (dateKey: string) => TimelineEvent[];
  hydrate: () => Promise<void>;
};

export const useTimelineByDateStore = create<TimelineByDateState>((set, get) => ({
  timelineByDate: {},
  setTimelineForDate: (dateKey, events) => {
    const next = events.slice(0, MAX_PER_DATE);
    set((state) => {
      const nextMap = { ...state.timelineByDate, [dateKey]: next };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextMap)).catch(() => {});
      return { timelineByDate: nextMap };
    });
  },
  getTimelineForDate: (dateKey) => {
    return get().timelineByDate[dateKey] ?? [];
  },
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return;
      const map: Record<string, TimelineEvent[]> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof key === 'string' && Array.isArray(value) && value.length <= MAX_PER_DATE) {
          const valid = value.every(
            (e): e is TimelineEvent =>
              e != null && typeof e === 'object' && typeof (e as TimelineEvent).hour === 'string' && typeof (e as TimelineEvent).text === 'string'
          );
          if (valid) map[key] = value;
        }
      }
      set({ timelineByDate: map });
    } catch {
    }
  },
}));
