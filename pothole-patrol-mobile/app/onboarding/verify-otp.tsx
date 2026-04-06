import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function VerifyOtpScreen() {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const { phone } = useLocalSearchParams();
    const confirmationResult = useAuthStore((state) => state.confirmationResult);
    const router = useRouter();

    const handleVerifyOTP = async () => {
        if (!otp || otp.length !== 6) {
            Alert.alert('Error', 'Please enter a valid 6-digit OTP');
            return;
        }

        try {
            setLoading(true);
            if (!confirmationResult) {
                Alert.alert('Error', 'Session expired. Please request a new OTP.');
                router.back();
                return;
            }
            await confirmationResult.confirm(otp);
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Verification Error', error.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 items-center justify-center p-6 bg-white">
            <Text className="text-2xl font-bold mb-4">Enter OTP</Text>
            <Text className="text-gray-500 mb-8">Sent to {phone}</Text>
            <TextInput
                className="w-full border border-gray-300 rounded-xl p-4 mb-4 text-lg text-center"
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                editable={!loading}
            />
            <TouchableOpacity
                className={`w-full bg-blue-600 rounded-xl p-4 items-center ${loading ? 'opacity-50' : ''}`}
                onPress={handleVerifyOTP}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white text-lg font-semibold">Verify & Continue</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}
