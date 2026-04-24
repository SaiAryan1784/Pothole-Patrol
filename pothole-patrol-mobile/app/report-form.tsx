import {
    View, Text, TextInput, Image, ScrollView,
    TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import type { AxiosError } from 'axios';
import { submitReport } from '../src/api/reports';
import { offlineQueue } from '../src/services/offlineQueue';
import { useOfflineQueueStore } from '../src/store/offlineQueueStore';

export default function ReportFormScreen() {
    const { imageUri } = useLocalSearchParams<{ imageUri: string; confidence?: string }>();

    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadStep, setUploadStep] = useState<'idle' | 'location' | 'uploading' | 'submitting'>('idle');

    const router = useRouter();
    const insets = useSafeAreaInsets();
    const refreshQueue = useOfflineQueueStore((s) => s.refresh);

    const enqueueForOffline = async (lat: number, lng: number) => {
        await offlineQueue.enqueue({
            imageUri: imageUri as string,
            latitude: lat,
            longitude: lng,
            description: description || undefined,
        });
        await refreshQueue();
        Alert.alert(
            "Saved — we'll upload when you're back online",
            'Your report is queued and will be sent automatically when the network returns. You can check its status under My Reports.',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)/my-uploads') }],
        );
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            setUploadStep('location');
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('Location permission is required to submit a report');
            }
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const latitude = location.coords.latitude;
            const longitude = location.coords.longitude;

            setUploadStep('uploading');
            let response;
            try {
                setUploadStep('submitting');
                response = await submitReport({
                    imageUri: imageUri as string,
                    latitude,
                    longitude,
                    description: description || undefined,
                });
            } catch (e) {
                const err = e as AxiosError;
                if (!err.response) {
                    // No server response — treat as offline and queue.
                    await enqueueForOffline(latitude, longitude);
                    return;
                }
                throw err; // fall through to the outer catch for real server errors
            }

            // Server returns one of two shapes:
            //   201 { id, image_url, ... }           → new report, poll for verification
            //   200 { deduped: true, existing_report_id, upvotes, detail } → nearby report upvoted
            if (response.status === 200 && response.data?.deduped) {
                Alert.alert(
                    'Nearby report already exists',
                    response.data.detail ?? 'We added your upvote to the existing report.',
                    [{ text: 'OK', onPress: () => router.replace('/(tabs)/feed') }],
                );
                return;
            }

            const reportData = response.data ?? {};
            const reportId = reportData.id ? String(reportData.id) : '';
            const imageUrl = reportData.image_url ? String(reportData.image_url) : '';

            if (!reportId) {
                // Unexpected shape — don't poll a garbage id.
                Alert.alert('Submitted', 'Your report is being processed. Check the Feed in a minute.',
                    [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]);
                return;
            }

            router.replace({
                pathname: '/submission-status',
                params: { reportId, imageUrl },
            });
        } catch (error: unknown) {
            const err = error as AxiosError<{ detail?: string }>;
            const message = err.response?.data?.detail
                ?? (error instanceof Error ? error.message : 'Failed to submit report');
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
                                Photo captured · tap back to retake
                            </Text>
                        </View>
                    </View>
                ) : null}

                {/* Severity note — server decides, not the user */}
                <View style={{
                    backgroundColor: '#f1f5f9',
                    borderRadius: 12,
                    padding: 14,
                    flexDirection: 'row',
                    gap: 10,
                    marginBottom: 20,
                }}>
                    <Ionicons name="sparkles-outline" size={18} color="#475569" style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: 13, color: '#334155', lineHeight: 18 }}>
                        Our AI classifies severity from your photo — no need to pick a level.
                    </Text>
                </View>

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
