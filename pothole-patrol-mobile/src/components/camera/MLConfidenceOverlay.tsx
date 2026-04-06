import { View, Text } from 'react-native';

interface Props {
    confidence: number;
}

export default function MLConfidenceOverlay({ confidence }: Props) {
    const isHighConfidence = confidence > 0.5;
    const percentage = Math.round(confidence * 100);

    return (
        <View className={`absolute top-10 self-center px-6 py-3 rounded-full shadow-lg ${isHighConfidence ? 'bg-green-500' : 'bg-orange-500'}`}>
            <Text className="text-white font-bold text-lg">
                {isHighConfidence ? `✓ Pothole Detected (${percentage}%)` : `⚠️ Low Confidence (${percentage}%)`}
            </Text>
        </View>
    );
}
