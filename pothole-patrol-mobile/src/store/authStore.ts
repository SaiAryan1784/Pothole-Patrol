import { create } from 'zustand';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  isLoading: boolean;
  confirmationResult: FirebaseAuthTypes.ConfirmationResult | null;
  setUser: (user: FirebaseAuthTypes.User | null) => void;
  setLoading: (loading: boolean) => void;
  setConfirmationResult: (result: FirebaseAuthTypes.ConfirmationResult | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  confirmationResult: null,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setConfirmationResult: (confirmationResult) => set({ confirmationResult }),
  logout: async () => {
    await auth().signOut();
    set({ user: null, confirmationResult: null });
  },
}));
