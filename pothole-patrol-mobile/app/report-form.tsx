import {
    View, Text, TextInput, Image, ScrollView,
    Alert, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import SeveritySelector from '../src/components/report/SeveritySelector';
import { Severity } from '../src/types/report.types';
import { useReportsStore } from '../src/store/reportsStore';
import axiosClient from '../src/api/axiosClient';

const SEVERITY_DESCRIPTIONS: Record<Severity, string> = {
    LOW: 'Small crack or minor dip — can be driven over carefully',
    MEDIUM: 'Noticeable pothole — requires caution',
    HIGH: 'Large pothole — risk of vehicle damage',
    CRITICAL: 'Extreme hazard — immediate attention required',
};

export default function ReportFormScreen() {
    const { imageUri, confidence } = useLocalSearchParams();
    const parsedConfidence = parseFloat(confidence as string);
    const initialSeverity: Severity = parsedConfidence >= 0.7 ? 'HIGH' : 'LOW';

    const [severity, setSeverity] = useState<Severity>(initialSeverity);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadStep, setUploadStep] = useState<'idle' | 'location' | 'uploading' | 'submitting'>('idle');

    const router = useRouter();
    const insets = useSafeAreaInsets();
    const addReport = useReportsStore((state) => state.addReport);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            setUploadStep('location');
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('Location permission is required to submit a report');
            }
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

            setUploadStep('uploading');
            const uriStr = imageUri as string;
            const filename = uriStr.split('/').pop() || `pothole_${Date.now()}.jpg`;

            const formData = new FormData();
            formData.append('image', { uri: uriStr, name: filename, type: 'image/jpeg' } as unknown as Blob);
            formData.append('latitude', String(location.coords.latitude));
            formData.append('longitude', String(location.coords.longitude));
            formData.append('severity', severity);
            formData.append('confidence', String(parsedConfidence));
            if (description) formData.append('description', description);

            setUploadStep('submitting');
            const response = await axiosClient.post('/reports/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            addReport(response.data);
            Alert.alert(
                'Report Submitted',
                'Your pothole has been reported. Our system will verify it shortly.',
                [{ text: 'Back to Map', onPress: () => router.replace('/(tabs)') }],
            );
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to submit report';
            Alert.alert('Submission Failed', message);
        } finally {
            setLoading(false);
            setUploadStep('idle');
        }
    };

    const stepLabel: Record<typeof uploadStep, string> = {
        idle: 'Submit Report',
        location: 'Getting location…',
        uploading: 'Uploading photo…',
        submitting: 'Submitting…',
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#f8fafc' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={{
                paddingTop: insets.top + 8,
                paddingHorizontal: 16,
                paddingBottom: 12,
                backgroundColor: '#ffffff',
                borderBottomWidth: 1,
                borderBottomColor: '#e2e8f0',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
            }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ padding: 4 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>Report Pothole</Text>
                    <Text style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>Anonymous · Verified by AI</Text>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Photo preview */}
                {imageUri ? (
                    <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20, height: 200 }}>
                        <Image
                            source={{ uri: imageUri as string }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                        <View style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 12, paddingVertical: 8,
                        }}>
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>
                                Photo captured · tap Retake in camera to change
                            </Text>
                        </View>
                    </View>
                ) : null}

                {/* Severity */}
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 }}>
                    How severe is it?
                </Text>
                <SeveritySelector selected={severity} onSelect={setSeverity} />
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 8, marginBottom: 20 }}>
                    {SEVERITY_DESCRIPTIONS[severity]}
                </Text>

                {/* Description */}
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    Additional details <Text style={{ fontWeight: '400', color: '#94a3b8' }}>(optional)</Text>
                </Text>
                <TextInput
                    style={{
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        borderRadius: 12,
                        padding: 14,
                        fontSize: 15,
                        color: '#1e293b',
                        height: 100,
                        textAlignVertical: 'top',
                        marginBottom: 24,
                    }}
                    placeholder="Exact location, nearby landmark, depth estimate…"
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                />

                {/* Info card */}
                <View style={{
                    backgroundColor: '#eff6ff',
                    borderRadius: 12,
                    padding: 14,
                    flexDirection: 'row',
                    gap: 10,
                    marginBottom: 24,
                }}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#2563EB" style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: 13, color: '#1d4ed8', lineHeight: 18 }}>
                        Your report is anonymous. GPS location and photo are shared with civic authorities to get this fixed.
                    </Text>
                </View>

                {/* Submit */}
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
                    style={{
                        backgroundColor: loading ? '#93c5fd' : '#2563EB',
                        borderRadius: 14,
                        paddingVertical: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 10,
                    }}
                >
                    {loading && <ActivityIndicator color="white" size="small" />}
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 }}>
                        {stepLabel[uploadStep]}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
