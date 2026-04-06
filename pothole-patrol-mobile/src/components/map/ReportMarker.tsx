import { Marker } from 'react-native-maps';
import { View } from 'react-native';
import { Severity } from '../../types/report.types';

interface Props {
    latitude: number;
    longitude: number;
    severity: Severity;
    onPress: () => void;
}

export default function ReportMarker({ latitude, longitude, severity, onPress }: Props) {
    const markerColors: Record<Severity, string> = {
        LOW: 'bg-green-500',
        MEDIUM: 'bg-orange-500',
        HIGH: 'bg-red-500',
        CRITICAL: 'bg-red-950',
    };

    return (
        <Marker coordinate={{ latitude, longitude }} onPress={onPress}>
            <View className={`w-6 h-6 rounded-full border-2 border-white shadow-sm ${markerColors[severity]}`} />
        </Marker>
    );
}
