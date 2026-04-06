import { create } from 'zustand';
import axiosClient from '../api/axiosClient';
import { Report } from '../types/report.types';

interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
}

interface ReportsState {
  reports: Report[];
  heatmapData: HeatmapPoint[];
  isLoading: boolean;
  setReports: (reports: Report[]) => void;
  addReport: (report: Report) => void;
  fetchHeatmapData: (lat: number, lng: number, radius?: number) => Promise<void>;
  fetchNearbyReports: (lat: number, lng: number, radius?: number) => Promise<void>;
}

export const useReportsStore = create<ReportsState>((set) => ({
  reports: [],
  heatmapData: [],
  isLoading: false,

  setReports: (reports) => set({ reports }),
  addReport: (report) => set((state) => ({ reports: [...state.reports, report] })),

  fetchHeatmapData: async (lat, lng, radius = 5000) => {
    try {
      set({ isLoading: true });
      const response = await axiosClient.get(`/heatmap/?lat=${lat}&lng=${lng}&radius=${radius}`);
      set({ heatmapData: response.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch heatmap data', error);
      set({ isLoading: false });
    }
  },

  fetchNearbyReports: async (lat, lng, radius = 5000) => {
    try {
      const response = await axiosClient.get(`/reports/nearby/?lat=${lat}&lng=${lng}&radius=${radius}`);
      set({ reports: response.data.results ?? response.data });
    } catch (error) {
      console.error('Failed to fetch nearby reports', error);
    }
  },
}));
