import { View, Text, TouchableOpacity, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useMLDetection } from '../../src/hooks/useMLDetection';
import MLConfidenceOverlay from '../../src/components/camera/MLConfidenceOverlay';
import { compressImage } from '../../src/utils/imageHelpers';

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const { runInference } = useMLDetection();
    const router = useRouter();
    const [confidence, setConfidence] = useState<number | null>(null);
    const [photoUri, setPhotoUri] = useState<string | null>(null);

    useEffect(() => {
        if (!permission?.granted && permission?.canAskAgain) {
            requestPermission();
        }
    }, [permission]);

    const handleCapture = async () => {
        if (cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                base64: true,
            });
            if (photo?.uri) {
                const compressedUri = await compressImage(photo.uri);
                setPhotoUri(compressedUri);
                const mlResult = await runInference(compressedUri);
                setConfidence(mlResult.confidence);
            }
        }
    };

    const handleContinue = () => {
        if (photoUri && confidence !== null) {
            router.push({
                pathname: '/report-form',
                params: { imageUri: photoUri, confidence: confidence.toString() }
            });
        }
    };

    if (!permission?.granted) return <View className="flex-1 bg-black" />;

    return (
        <View className="flex-1 bg-black">
            {!photoUri ? (
                <CameraView ref={cameraRef} className="absolute inset-0" facing="back" />
            ) : (
                <Image source={{ uri: photoUri }} className="absolute inset-0" />
            )}

            {confidence !== null && <MLConfidenceOverlay confidence={confidence} />}

            <View className="absolute bottom-10 w-full flex-row justify-center items-center">
                {!photoUri ? (
                    <TouchableOpacity
                        className="bg-white rounded-full w-20 h-20 border-4 border-gray-300 items-center justify-center"
                        onPress={handleCapture}
                    />
                ) : (
                    <View className="flex-row gap-4">
                        <TouchableOpacity className="bg-white px-6 py-3 rounded-xl" onPress={() => { setPhotoUri(null); setConfidence(null); }}>
                            <Text className="text-black font-semibold">Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="bg-blue-600 px-6 py-3 rounded-xl" onPress={handleContinue}>
                            <Text className="text-white font-semibold">Continue</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}
