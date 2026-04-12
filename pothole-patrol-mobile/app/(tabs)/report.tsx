import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { compressImage } from '../../src/utils/imageHelpers';
import { useMLDetection } from '../../src/hooks/useMLDetection';

const ML_GATE_THRESHOLD = parseFloat(process.env.EXPO_PUBLIC_ML_CONFIDENCE_THRESHOLD ?? '0.5');

function PulsingRing() {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.7);

    useEffect(() => {
        scale.value = withRepeat(
            withTiming(1.5, { duration: 1200, easing: Easing.out(Easing.ease) }),
            -1,
            false,
        );
        opacity.value = withRepeat(
            withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) }),
            -1,
            false,
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[{
                position: 'absolute',
                width: 80, height: 80, borderRadius: 40,
                borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)',
            }, style]}
        />
    );
}

// Corner bracket component
function Corners() {
    const arm = 24;
    const thickness = 3;
    const color = 'rgba(255,255,255,0.85)';
    const offset = 56;

    const corners = [
        { top: offset, left: offset, borderTopWidth: thickness, borderLeftWidth: thickness },
        { top: offset, right: offset, borderTopWidth: thickness, borderRightWidth: thickness },
        { bottom: offset, left: offset, borderBottomWidth: thickness, borderLeftWidth: thickness },
        { bottom: offset, right: offset, borderBottomWidth: thickness, borderRightWidth: thickness },
    ] as const;

    return (
        <>
            {corners.map((pos, i) => (
                <View
                    key={i}
                    style={{
                        position: 'absolute',
                        width: arm, height: arm,
                        borderColor: color,
                        ...pos,
                    }}
                />
            ))}
        </>
    );
}

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const router = useRouter();
    const [capturing, setCapturing] = useState(false);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [mlConfidence, setMlConfidence] = useState<number>(0);
    const [analyzing, setAnalyzing] = useState(false);
    const [inferenceRan, setInferenceRan] = useState(false);
    const { runInference, modelLoaded } = useMLDetection();

    const handleCapture = async () => {
        if (!cameraRef.current || capturing) return;
        setCapturing(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
            if (photo?.uri) {
                const compressed = await compressImage(photo.uri);
                setPhotoUri(compressed);
                setInferenceRan(false);

                // Run on-device TFLite inference in the background.
                // If the model isn't bundled, runInference returns { confidence: 0 }
                // gracefully — the server will verify regardless.
                setAnalyzing(true);
                try {
                    const result = await runInference(compressed);
                    setMlConfidence(result.confidence);
                } finally {
                    setAnalyzing(false);
                    setInferenceRan(true);
                }
            }
        } finally {
            setCapturing(false);
        }
    };

    // Block Continue only when the model ran AND returned a low confidence score.
    // If the model is unavailable (modelLoaded=false), let the server decide.
    const blocked = inferenceRan && modelLoaded && mlConfidence < ML_GATE_THRESHOLD;

    const handleContinue = () => {
        if (!photoUri || blocked) return;
        router.push({
            pathname: '/report-form',
            params: { imageUri: photoUri, confidence: String(mlConfidence) },
        });
    };

    if (!permission) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#94a3b8" size="large" />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                    <Ionicons name="camera-outline" size={48} color="#475569" />
                </View>
                <Text style={{ color: '#f1f5f9', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 10 }}>
                    Camera access needed
                </Text>
                <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
                    Grant camera permission to photograph and report road hazards in your area.
                </Text>
                {permission.canAskAgain ? (
                    <TouchableOpacity
                        style={{
                            backgroundColor: '#2563EB', width: '100%',
                            paddingVertical: 16, borderRadius: 14, alignItems: 'center',
                        }}
                        onPress={requestPermission}
                    >
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Grant Camera Access</Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={{ color: '#475569', textAlign: 'center', fontSize: 13 }}>
                        Enable camera in your device Settings to continue.
                    </Text>
                )}
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            {!photoUri ? (
                <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
            ) : (
                <Image source={{ uri: photoUri }} style={{ flex: 1 }} resizeMode="cover" />
            )}

            {/* Corner brackets — only in live camera mode */}
            {!photoUri && <Corners />}

            {/* Instruction pill */}
            {!photoUri && (
                <View style={{
                    position: 'absolute', top: 52, alignSelf: 'center',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                }}>
                    <Ionicons name="locate" size={14} color="rgba(255,255,255,0.75)" />
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '500' }}>
                        Point at the pothole and tap capture
                    </Text>
                </View>
            )}

            {/* Bottom controls */}
            <View style={{ position: 'absolute', bottom: 48, width: '100%', alignItems: 'center' }}>
                {!photoUri ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                        {/* Pulse ring — hidden when capturing */}
                        {!capturing && <PulsingRing />}
                        {/* Shutter button */}
                        <TouchableOpacity
                            style={{
                                width: 72, height: 72, borderRadius: 36,
                                backgroundColor: 'white',
                                borderWidth: 4, borderColor: 'rgba(255,255,255,0.4)',
                                alignItems: 'center', justifyContent: 'center',
                                opacity: capturing ? 0.6 : 1,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
                            }}
                            onPress={handleCapture}
                            disabled={capturing}
                        >
                            {capturing
                                ? <ActivityIndicator color="#374151" size="small" />
                                : <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'white', borderWidth: 2, borderColor: '#d1d5db' }} />
                            }
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={{ alignItems: 'center', gap: 10, paddingHorizontal: 16 }}>
                        {/* Confidence indicator — shown once inference completes */}
                        {inferenceRan && modelLoaded && (
                            <View style={{
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                                backgroundColor: blocked ? 'rgba(239,68,68,0.9)' : 'rgba(34,197,94,0.9)',
                                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                            }}>
                                <Ionicons
                                    name={blocked ? 'close-circle' : 'shield-checkmark'}
                                    size={14}
                                    color="white"
                                />
                                <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
                                    {blocked
                                        ? `Confidence ${Math.round(mlConfidence * 100)}% — too low`
                                        : `Confidence ${Math.round(mlConfidence * 100)}%`}
                                </Text>
                            </View>
                        )}
                        {/* Error message when blocked */}
                        {blocked && (
                            <View style={{
                                backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10,
                                paddingHorizontal: 16, paddingVertical: 8, marginBottom: 2,
                            }}>
                                <Text style={{ color: '#fca5a5', fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                                    This doesn&apos;t look like a pothole. Try a closer, well-lit photo of the road.
                                </Text>
                            </View>
                        )}
                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.12)',
                                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                                    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14,
                                }}
                                onPress={() => { setPhotoUri(null); setMlConfidence(0); setInferenceRan(false); }}
                            >
                                <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Retake</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: blocked ? '#64748b' : '#2563EB',
                                    flexDirection: 'row',
                                    alignItems: 'center', gap: 8,
                                    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14,
                                    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: analyzing || blocked ? 0 : 0.4,
                                    shadowRadius: 8, elevation: analyzing || blocked ? 0 : 6,
                                    opacity: analyzing ? 0.7 : 1,
                                }}
                                onPress={handleContinue}
                                disabled={analyzing || blocked}
                            >
                                {analyzing && <ActivityIndicator color="white" size="small" />}
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                                    {analyzing ? 'Analysing…' : 'Continue →'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}
