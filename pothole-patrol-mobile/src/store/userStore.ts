import { create } from 'zustand';
import axiosClient from '../api/axiosClient';
import { Badge, UserProfile } from '../types/user.types';

interface UserState {
  points: number;
  badges: Badge[];
  profile: UserProfile | null;
  isLoading: boolean;
  setPoints: (points: number) => void;
  fetchScore: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  points: 0,
  badges: [],
  profile: null,
  isLoading: false,

  setPoints: (points) => set({ points }),

  fetchScore: async () => {
    try {
      set({ isLoading: true });
      const response = await axiosClient.get('/gamification/score/');
      set({ points: response.data.total_points, badges: response.data.badges });
    } catch (error) {
      console.error('Failed to fetch user score', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfile: async () => {
    try {
      set({ isLoading: true });
      const response = await axiosClient.get('/accounts/me/');
      set({ profile: response.data });
    } catch (error) {
      console.error('Failed to fetch user profile', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
