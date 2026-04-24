/**
 * Post-capture crop screen.
 *
 * Shown between camera capture and the report form. Lets the user zoom/pan
 * a square crop around the pothole so the ML model sees a tighter frame.
 * Both the on-device TFLite and the server-side YOLOv8 will run against the
 * cropped image — a small pothole in the corner of the original frame becomes
 * a large one in the cropped input, which dramatically improves detection.
 */
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CropOverlay from '../src/components/camera/CropOverlay';
import { cropAndResize, getImageSize, NormalizedRect } from '../src/utils/imageHelpers';
import { useMLDetection } from '../src/hooks/useMLDetection';

const ML_GATE_THRESHOLD = parseFloat(process.env.EXPO_PUBLIC_ML_CONFIDENCE_THRESHOLD ?? '0.5');

export default function ReportCropScreen() {
    const { imageUri } = useLocalSearchParams<{ imageUri: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { runInference, modelLoaded } = useMLDetection();

    const [display, setDisplay] = useState<{ width: number; height: number } | null>(null);
    const [busy, setBusy] = useState(false);
    const [busyLabel, setBusyLabel] = useState('');

    // Latest user-adjusted crop rect, normalized to the overlay's own dimensions
    // (which equals the image's dimensions since we size the Image to the intrinsic aspect).
    const rectRef = useRef<NormalizedRect | null>(null);

    useEffect(() => {
        if (!imageUri) return;
        let cancelled = false;
        (async () => {
            try {
                const { width: imgW, height: imgH } = await getImageSize(imageUri);
                const screen = Dimensions.get('window');
                // Reserve vertical space for header + footer.
                const availableH = screen.height - insets.top - insets.bottom - 200;
                const availableW = screen.width - 24;
                const scale = Math.min(availableW / imgW, availableH / imgH);
                const w = Math.floor(imgW * scale);
                const h = Math.floor(imgH * scale);
                if (!cancelled) {
                    setDisplay({ width: w, height: h });
                    // Seed the initial rect so a user who skips pan/pinch still has a default.
                    const sidePx = Math.min(w, h) * 0.7;
                    rectRef.current = {
                        x: (w - sidePx) / 2 / w,
                        y: (h - sidePx) / 2 / h,
                        width: sidePx / w,
                        height: sidePx / h,
                    };
                }
            } catch {
                if (!cancelled) {
                    Alert.alert('Image error', 'Could not load the photo. Please retake.');
                    router.back();
                }
            }
        })();
        return () => { cancelled = true; };
    }, [imageUri, insets.top, insets.bottom, router]);

    const runInferenceAndContinue = async (uri: string, confidence: number) => {
        if (modelLoaded && confidence < ML_GATE_THRESHOLD) {
            Alert.alert(
                "We're not sure this is a pothole",
                `Our on-device check gave this photo a confidence of ${Math.round(confidence * 100)}%. You can still submit — the server will make the final call.`,
                [
                    { text: 'Retake', style: 'cancel', onPress: () => router.back() },
                    {
                        text: 'Submit anyway',
                        onPress: () => router.push({
                            pathname: '/report-form',
                            params: { imageUri: uri, confidence: String(confidence) },
                        }),
                    },
                ],
            );
            return;
        }
        router.push({
            pathname: '/report-form',
            params: { imageUri: uri, confidence: String(confidence) },
        });
    };

    const handleAnalyse = async () => {
        if (!imageUri || !rectRef.current) return;
        setBusy(true);
        try {
            setBusyLabel('Cropping…');
            const croppedUri = await cropAndResize(imageUri, rectRef.current);
            setBusyLabel('Analysing…');
            const result = await runInference(croppedUri);
            await runInferenceAndContinue(croppedUri, result.confidence);
        } catch {
            Alert.alert('Crop failed', 'Please try again or skip the crop.');
        } finally {
            setBusy(false);
            setBusyLabel('');
        }
    };

    const handleSkip = async () => {
        if (!imageUri) return;
        setBusy(true);
        try {
            setBusyLabel('Analysing…');
            const result = await runInference(imageUri);
            await runInferenceAndContinue(imageUri, result.confidence);
        } catch {
            Alert.alert('Analysis failed', 'Please try again.');
        } finally {
            setBusy(false);
            setBusyLabel('');
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
            {/* Header */}
            <View style={{
                paddingHorizontal: 16, paddingVertical: 12,
                flexDirection: 'row', alignItems: 'center', gap: 12,
            }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="arrow-back" size={24} color="#f1f5f9" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#f8fafc', fontSize: 17, fontWeight: '700' }}>Tighten the crop</Text>
                    <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                        Drag and pinch so the pothole fills the square, then tap Analyse.
                    </Text>
                </View>
            </View>

            {/* Image + crop overlay */}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                {display && imageUri ? (
                    <View style={{ width: display.width, height: display.height }}>
                        <Image
                            source={{ uri: imageUri as string }}
                            style={{ width: display.width, height: display.height }}
                            resizeMode="contain"
                        />
                        <CropOverlay
                            width={display.width}
                            height={display.height}
                            onCropChange={(r) => { rectRef.current = r; }}
                        />
                    </View>
                ) : (
                    <ActivityIndicator color="#94a3b8" size="large" />
                )}
            </View>

            {/* Footer buttons */}
            <View style={{
                paddingHorizontal: 16, paddingBottom: insets.bottom + 16, paddingTop: 12,
                flexDirection: 'row', gap: 12,
            }}>
                <TouchableOpacity
                    onPress={handleSkip}
                    disabled={busy || !display}
                    style={{
                        flex: 1, backgroundColor: 'rgba(255,255,255,0.12)',
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
                        borderRadius: 14, paddingVertical: 14, alignItems: 'center',
                        opacity: busy || !display ? 0.5 : 1,
                    }}
                >
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>
                        Use full photo
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleAnalyse}
                    disabled={busy || !display}
                    style={{
                        flex: 1.2, backgroundColor: '#2563EB',
                        borderRadius: 14, paddingVertical: 14, alignItems: 'center',
                        flexDirection: 'row', justifyContent: 'center', gap: 8,
                        opacity: busy || !display ? 0.7 : 1,
                    }}
                >
                    {busy && <ActivityIndicator color="white" size="small" />}
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                        {busy ? busyLabel : 'Crop & Analyse'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
