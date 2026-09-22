import { create } from 'zustand';
import { analysisApi } from '../api/analysis.api';
import { AnalysisSummaryCard, RoomType } from '../api/types';

interface HistoryState {
  items: AnalysisSummaryCard[];
  isLoading: boolean;
  isRefreshing: boolean;
  selectedFilter: RoomType | undefined;
  page: number;
  hasMore: boolean;

  setFilter: (filter?: RoomType) => void;
  fetchHistory: (page?: number) => Promise<void>;
  refreshHistory: () => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  isLoading: false,
  isRefreshing: false,
  selectedFilter: undefined,
  page: 1,
  hasMore: true,

  setFilter: (filter) => {
    set({ selectedFilter: filter, page: 1, items: [] });
    get().fetchHistory(1);
  },

  fetchHistory: async (targetPage = 1) => {
    if (get().isLoading) return;
    set({ isLoading: true });

    try {
      const result = await analysisApi.listAnalyses(
        targetPage,
        15,
        get().selectedFilter,
      );

      set({
        items:
          targetPage === 1
            ? result.data
            : [...get().items, ...result.data],
        page: targetPage,
        hasMore: result.pagination.hasNextPage,
        isLoading: false,
      });
    } catch (err) {
      console.warn('Failed to load history:', err);
      set({ isLoading: false });
    }
  },

  refreshHistory: async () => {
    set({ isRefreshing: true });
    try {
      const result = await analysisApi.listAnalyses(1, 15, get().selectedFilter);
      set({
        items: result.data,
        page: 1,
        hasMore: result.pagination.hasNextPage,
        isRefreshing: false,
      });
    } catch {
      set({ isRefreshing: false });
    }
  },

  removeItem: async (id: string) => {
    try {
      await analysisApi.deleteAnalysis(id);
      set({ items: get().items.filter((item) => item.id !== id) });
    } catch (err) {
      console.warn('Failed to delete item:', err);
    }
  },
}));
