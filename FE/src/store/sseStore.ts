import { create } from 'zustand';

export type TimelineEvent = {
  hour: string;
  text: string;
};

type SSEState = {
  timelineEvents: TimelineEvent[];
  prependTimelineEvent: (event: TimelineEvent) => void;
  clearTimeline: () => void;
};

const MAX_EVENTS = 50;

export const useSSEStore = create<SSEState>((set) => ({
  timelineEvents: [],
  prependTimelineEvent: (event) =>
    set((state) => ({
      timelineEvents: [event, ...state.timelineEvents].slice(0, MAX_EVENTS),
    })),
  clearTimeline: () => set({ timelineEvents: [] }),
}));
