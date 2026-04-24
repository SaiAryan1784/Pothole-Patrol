/**
 * Offline report queue — pure CRUD over AsyncStorage.
 *
 * Stores pending report payloads when the user submits without network. The
 * sync hook drains the queue when connectivity returns. Image bytes are NOT
 * stored here — we keep the local file URI (already compressed + cropped) and
 * trust Expo's cache directory to retain it. If eviction becomes an issue we
 * can copy images into FileSystem.documentDirectory later.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type QueuedReport = {
    id: string;              // local UUID, not a server id
    imageUri: string;        // local file:// path
    latitude: number;
    longitude: number;
    description?: string;
    createdAt: number;       // ms epoch
    attempts: number;
    lastError?: string;
};

const KEY = 'offlineReportQueue:v1';

const parse = (raw: string | null): QueuedReport[] => {
    if (!raw) return [];
    try {
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
};

export const offlineQueue = {
    async list(): Promise<QueuedReport[]> {
        return parse(await AsyncStorage.getItem(KEY));
    },
    async set(items: QueuedReport[]): Promise<void> {
        await AsyncStorage.setItem(KEY, JSON.stringify(items));
    },
    async enqueue(
        input: Omit<QueuedReport, 'id' | 'createdAt' | 'attempts' | 'lastError'>,
    ): Promise<QueuedReport> {
        const item: QueuedReport = {
            ...input,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: Date.now(),
            attempts: 0,
        };
        const items = await this.list();
        items.push(item);
        await this.set(items);
        return item;
    },
    async remove(id: string): Promise<void> {
        const items = await this.list();
        await this.set(items.filter((it) => it.id !== id));
    },
    async recordAttempt(id: string, lastError?: string): Promise<void> {
        const items = await this.list();
        await this.set(
            items.map((it) =>
                it.id === id ? { ...it, attempts: it.attempts + 1, lastError } : it,
            ),
        );
    },
    async clear(): Promise<void> {
        await AsyncStorage.removeItem(KEY);
    },
};
