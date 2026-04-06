import { View, Text, TextInput, Image, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import storage from '@react-native-firebase/storage';
import * as Location from 'expo-location';
import SeveritySelector from '../src/components/report/SeveritySelector';
import AppButton from '../src/components/ui/AppButton';
import { Severity } from '../src/types/report.types';
import { useReportsStore } from '../src/store/reportsStore';
import axiosClient from '../src/api/axiosClient';
import { useAuthStore } from '../src/store/authStore';

export default function ReportFormScreen() {
    const { imageUri, confidence } = useLocalSearchParams();
    const parsedConfidence = parseFloat(confidence as string);
    const initialSeverity: Severity = parsedConfidence >= 0.7 ? 'HIGH' : 'LOW';

    const [severity, setSeverity] = useState<Severity>(initialSeverity);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const addReport = useReportsStore((state) => state.addReport);
    const user = useAuthStore((state) => state.user);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('Location permission is required to submit a report');
            }
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

            const uriStr = imageUri as string;
            const filename = uriStr.split('/').pop() || `pothole_${Date.now()}.jpg`;
            const reference = storage().ref(`reports/${user?.uid}/${filename}`);
            
            await reference.putFile(uriStr);
            const downloadUrl = await reference.getDownloadURL();

            const payload = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                severity: severity,
                description: description,
                confidence: parsedConfidence,
                image_url: downloadUrl,
            };

            const response = await axiosClient.post('/reports/', payload);
            
            addReport(response.data);

            Alert.alert('Success', 'Pothole reported successfully!');
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView className="flex-1 bg-white p-6 pt-12">
            <Text className="text-2xl font-bold mb-6">Report Pothole</Text>

            {imageUri && (
                <Image source={{ uri: imageUri as string }} className="w-full h-48 rounded-xl mb-6 bg-gray-100" />
            )}

            <Text className="text-gray-700 font-medium mb-2">Severity Level</Text>
            <View className="mb-6">
                <SeveritySelector selected={severity} onSelect={setSeverity} />
            </View>

            <Text className="text-gray-700 font-medium mb-2">Description (Optional)</Text>
            <TextInput
                className="w-full border border-gray-300 rounded-xl p-4 mb-8 text-base h-24"
                placeholder="Add details about the pothole..."
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
            />

            <AppButton title="Submit Report" onPress={handleSubmit} loading={loading} />
        </ScrollView>
    );
}
