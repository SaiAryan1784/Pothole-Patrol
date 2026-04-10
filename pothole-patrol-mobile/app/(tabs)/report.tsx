import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { compressImage } from '../../src/utils/imageHelpers';

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const router = useRouter();
    const [capturing, setCapturing] = useState(false);
    const [photoUri, setPhotoUri] = useState<string | null>(null);

    const handleCapture = async () => {
        if (!cameraRef.current || capturing) return;
        setCapturing(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
            if (photo?.uri) {
                const compressed = await compressImage(photo.uri);
                setPhotoUri(compressed);
            }
        } finally {
            setCapturing(false);
        }
    };

    const handleContinue = () => {
        if (!photoUri) return;
        router.push({
            pathname: '/report-form',
            params: { imageUri: photoUri, confidence: '0.75' },
        });
    };

    // Permission not yet determined
    if (!permission) {
        return (
            <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="white" size="large" />
            </View>
        );
    }

    // Permission denied
    if (!permission.granted) {
        return (
            <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
                    Camera access is needed to report potholes
                </Text>
                <Text style={{ color: '#9ca3af', textAlign: 'center', marginBottom: 24 }}>
                    Grant permission so you can capture road hazards.
                </Text>
                {permission.canAskAgain ? (
                    <TouchableOpacity
                        style={{ backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
                        onPress={requestPermission}
                    >
                        <Text style={{ color: 'black', fontWeight: '600' }}>Grant Camera Access</Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={{ color: '#6b7280', textAlign: 'center' }}>
                        Enable camera in your device Settings to continue.
                    </Text>
                )}
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            {/* Camera or photo preview */}
            {!photoUri ? (
                <CameraView
                    ref={cameraRef}
                    style={{ flex: 1 }}
                    facing="back"
                />
            ) : (
                <Image source={{ uri: photoUri }} style={{ flex: 1 }} resizeMode="cover" />
            )}

            {/* Instruction label */}
            {!photoUri && (
                <View style={{ position: 'absolute', top: 48, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 }}>
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '500' }}>
                        Point at the pothole and tap capture
                    </Text>
                </View>
            )}

            {/* Bottom controls */}
            <View style={{ position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' }}>
                {!photoUri ? (
                    <TouchableOpacity
                        style={{
                            width: 80, height: 80, borderRadius: 40,
                            backgroundColor: 'white', borderWidth: 4, borderColor: '#d1d5db',
                            alignItems: 'center', justifyContent: 'center',
                            opacity: capturing ? 0.5 : 1,
                        }}
                        onPress={handleCapture}
                        disabled={capturing}
                    >
                        {capturing && <ActivityIndicator color="#374151" />}
                    </TouchableOpacity>
                ) : (
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <TouchableOpacity
                            style={{ backgroundColor: 'white', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 }}
                            onPress={() => setPhotoUri(null)}
                        >
                            <Text style={{ color: 'black', fontWeight: '600', fontSize: 16 }}>Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ backgroundColor: '#2563eb', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 }}
                            onPress={handleContinue}
                        >
                            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Continue</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}
