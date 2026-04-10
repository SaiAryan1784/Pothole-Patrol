import { create } from 'zustand';

// Generates a UUID v4-style string for use as a Firebase Storage path prefix.
// Generated once per app session — no persistence needed since we don't track users.
const generateSessionId = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const SESSION_DEVICE_ID = generateSessionId();

interface DeviceState {
  deviceId: string;
}

export const useDeviceStore = create<DeviceState>(() => ({
  deviceId: SESSION_DEVICE_ID,
}));
