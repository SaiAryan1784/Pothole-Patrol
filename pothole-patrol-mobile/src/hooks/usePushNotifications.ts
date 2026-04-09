import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import axiosClient from '../api/axiosClient';
import { useAuthStore } from '../store/authStore';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export function usePushNotifications() {
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        async function requestUserPermission() {
            if (!user) return; // Only process if user is logged in
            
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                try {
                    const token = await messaging().getToken();
                    await axiosClient.post('/notifications/devices/', { token });
                } catch (e) {
                    console.error('Failed to register FCM token', e);
                }
            }
        }

        requestUserPermission();

        const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
            if (remoteMessage.notification) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: remoteMessage.notification.title || 'Notification',
                        body: remoteMessage.notification.body || '',
                        data: remoteMessage.data,
                    },
                    trigger: null,
                });
            }
        });

        return () => {
            unsubscribeForeground();
        };
    }, [user]);
}
