/**
 * Offline queue sync — mount useOfflineQueueSync() once at the app root.
 *
 * Subscribes to network and app-state changes; whenever the device comes
 * back online or the app is foregrounded, drains the offline queue one item
 * at a time.
 *
 * Error classification:
 *   - axios error with no `response`  → network down. Pause batch; try again
 *     next reconnect.
 *   - response.status in transient set → server temporarily unhappy. Same.
 *   - response.status is some other 4xx → permanent rejection. Drop the item.
 *   - 2xx → success. Remove from queue.
 *
 * `flushOfflineQueue` is exported separately so any screen (e.g. "Retry"
 * button) can trigger an immediate flush without remounting the hook.
 */
import { useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import type { AxiosError } from 'axios';
import { offlineQueue } from '../services/offlineQueue';
import { submitReport } from '../api/reports';
import { useOfflineQueueStore } from '../store/offlineQueueStore';

const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

let flushing = false;

export const flushOfflineQueue = async (): Promise<void> => {
    if (flushing) return;
    flushing = true;
    try {
        const items = await offlineQueue.list();
        for (const item of items) {
            try {
                await submitReport(item);
                await offlineQueue.remove(item.id);
            } catch (e) {
                const err = e as AxiosError<{ detail?: string }>;
                const status = err.response?.status;

                if (!status) {
                    await offlineQueue.recordAttempt(item.id, 'Network unavailable');
                    break;
                }
                if (TRANSIENT_STATUSES.has(status)) {
                    await offlineQueue.recordAttempt(item.id, `Server returned ${status}`);
                    break;
                }
                const detail = err.response?.data?.detail;
                await offlineQueue.remove(item.id);
                console.warn('[offlineQueue] dropped', item.id, detail ?? status);
            }
        }
        await useOfflineQueueStore.getState().refresh();
    } finally {
        flushing = false;
    }
};

export const useOfflineQueueSync = () => {
    const refresh = useOfflineQueueStore((s) => s.refresh);

    const flush = useCallback(async () => {
        await flushOfflineQueue();
    }, []);

    useEffect(() => {
        refresh();

        const netUnsub = NetInfo.addEventListener((state) => {
            if (state.isConnected && state.isInternetReachable !== false) {
                flush();
            }
        });
        const appSub = AppState.addEventListener('change', (s: AppStateStatus) => {
            if (s === 'active') flush();
        });

        return () => {
            netUnsub();
            appSub.remove();
        };
    }, [refresh, flush]);

    return { flush };
};
