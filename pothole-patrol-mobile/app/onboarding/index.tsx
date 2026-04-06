import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuthStore } from '../../src/store/authStore';

export default function WelcomeScreen() {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const setConfirmationResult = useAuthStore((state) => state.setConfirmationResult);

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        });
    }, []);

    const handleSendOTP = async () => {
        if (!phone) {
            Alert.alert('Error', 'Please enter a valid phone number');
            return;
        }
        
        try {
            setLoading(true);
            const confirmation = await auth().signInWithPhoneNumber(phone);
            setConfirmationResult(confirmation);
            router.push({ pathname: '/onboarding/verify-otp', params: { phone } });
        } catch (error: any) {
            Alert.alert('OTP Error', error.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const response: any = await GoogleSignin.signIn();
            const idToken = response?.data?.idToken || response?.idToken;
            
            if (!idToken) {
                throw new Error('No ID token found from Google Sign-In');
            }
            const googleCredential = auth.GoogleAuthProvider.credential(idToken);
            await auth().signInWithCredential(googleCredential);
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Google Sign-In Error', error.message || 'Failed to sign in with Google');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 items-center justify-center p-6 bg-white">
            <Text className="text-3xl font-bold mb-8">Pothole Patrol</Text>
            <Text className="text-gray-500 mb-4 text-center">Enter phone number to report potholes</Text>
            
            <TextInput
                className="w-full border border-gray-300 rounded-xl p-4 mb-4 text-lg"
                placeholder="+91 9999999999"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                editable={!loading}
            />
            
            <TouchableOpacity
                className={`w-full bg-blue-600 rounded-xl p-4 items-center mb-4 ${loading ? 'opacity-50' : ''}`}
                onPress={handleSendOTP}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white text-lg font-semibold">Send OTP</Text>
                )}
            </TouchableOpacity>

            <View className="flex-row items-center w-full mb-4">
                <View className="flex-1 h-px bg-gray-300" />
                <Text className="mx-4 text-gray-400">or</Text>
                <View className="flex-1 h-px bg-gray-300" />
            </View>

            <TouchableOpacity
                className={`w-full border border-gray-300 rounded-xl p-4 items-center flex-row justify-center ${loading ? 'opacity-50' : ''}`}
                onPress={handleGoogleSignIn}
                disabled={loading}
            >
                <Text className="text-gray-700 text-lg font-semibold">Sign in with Google</Text>
            </TouchableOpacity>
        </View>
    );
}
