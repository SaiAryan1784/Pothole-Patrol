import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import auth from '@react-native-firebase/auth';
import { useAuthStore } from '../src/store/authStore';
import { useOfflineQueueSync } from '../src/hooks/useOfflineQueueSync';
import './global.css';

export default function RootLayout() {
    const { isReady, setFirebaseUser, setReady } = useAuthStore();
    useOfflineQueueSync();

    useEffect(() => {
        /**
         * onAuthStateChanged fires immediately on mount:
         *   - With an existing user if Firebase has a persisted session (app restart)
         *   - With null if this is a fresh install
         *
         * We only call signInAnonymously() when there is genuinely no user.
         * Firebase persists the anonymous UID in device storage, so the same
         * UID is reused across app restarts until the app is uninstalled.
         */
        const unsubscribe = auth().onAuthStateChanged(async (user) => {
            if (user) {
                setFirebaseUser(user);
                setReady();
            } else {
                try {
                    // Returns immediately — Firebase handles the network call
                    // and fires onAuthStateChanged again with the new user.
                    await auth().signInAnonymously();
                } catch (error) {
                    // Network offline or Firebase misconfigured — still mark
                    // ready so the app doesn't hang forever on the loading screen.
                    console.error('[Auth] signInAnonymously failed:', error);
                    setReady();
                }
            }
        });

        return unsubscribe;
    }, []);

    // Hold the splash until Firebase resolves — typically < 300ms on device.
    if (!isReady) {
        return (
            <View style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <BottomSheetModalProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="report-crop" options={{ headerShown: false }} />
                    <Stack.Screen name="report-form" options={{ headerShown: false }} />
                    <Stack.Screen name="submission-status" options={{ headerShown: false }} />
                </Stack>
                <Toast />
            </BottomSheetModalProvider>
        </GestureHandlerRootView>
    );
}
