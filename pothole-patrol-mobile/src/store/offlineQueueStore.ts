import { create } from 'zustand';
import { offlineQueue, QueuedReport } from '../services/offlineQueue';

type State = {
    items: QueuedReport[];
    refresh: () => Promise<void>;
};

export const useOfflineQueueStore = create<State>((set) => ({
    items: [],
    refresh: async () => {
        const items = await offlineQueue.list();
        set({ items });
    },
}));
