import { create } from 'zustand';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

/**
 * Holds the result of Firebase Anonymous Auth initialisation.
 *
 * isReady: false until onAuthStateChanged fires for the first time.
 * firebaseUser: the Firebase User object (always set once ready, because we
 *   call signInAnonymously() when there is no persisted session).
 *
 * Initialisation is triggered from the root _layout.tsx via useEffect so
 * it runs exactly once at app start. The store itself is state-only.
 */
interface AuthState {
    isReady: boolean;
    firebaseUser: FirebaseAuthTypes.User | null;
    setFirebaseUser: (user: FirebaseAuthTypes.User | null) => void;
    setReady: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    isReady: false,
    firebaseUser: null,
    setFirebaseUser: (user) => set({ firebaseUser: user }),
    setReady: () => set({ isReady: true }),
}));
