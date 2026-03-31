import { create } from 'zustand';

type TodayReportState = {
  reportText: string | null;
  imageUrl: string | null;
  setTodayReport: (reportText: string | null, imageUrl: string | null) => void;
};

export const useTodayReportStore = create<TodayReportState>((set) => ({
  reportText: null,
  imageUrl: null,
  setTodayReport: (reportText, imageUrl) => set({ reportText, imageUrl }),
}));