import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import auth from '@react-native-firebase/auth';
import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../src/store/authStore';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import './global.css';

messaging().setBackgroundMessageHandler(async remoteMessage => {
    if (remoteMessage.notification) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: remoteMessage.notification.title ?? 'Pothole Patrol',
                body: remoteMessage.notification.body ?? '',
                data: remoteMessage.data ?? {},
            },
            trigger: null,
        });
    }
});

export default function RootLayout() {
    const setUser = useAuthStore((state) => state.setUser);
    const setLoading = useAuthStore((state) => state.setLoading);
    const router = useRouter();
    const segments = useSegments();

    usePushNotifications();

    useEffect(() => {
        const subscriber = auth().onAuthStateChanged((user) => {
            setUser(user);
            setLoading(false);
            
            const inAuthGroup = segments[0] === 'onboarding';
            
            if (user && inAuthGroup) {
                router.replace('/(tabs)');
            } else if (!user && !inAuthGroup) {
                router.replace('/onboarding');
            }
        });
        return subscriber;
    }, [segments]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <BottomSheetModalProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                </Stack>
                <Toast />
            </BottomSheetModalProvider>
        </GestureHandlerRootView>
    );
}
