import { Marker } from 'react-native-maps';
import { View } from 'react-native';
import { Severity } from '../../types/report.types';

interface Props {
    latitude: number;
    longitude: number;
    severity: Severity;
    onPress: () => void;
}

const SEVERITY_CONFIG: Record<Severity, { color: string; size: number; border: number }> = {
    LOW:      { color: '#22c55e', size: 20, border: 2 },
    MEDIUM:   { color: '#f97316', size: 24, border: 2 },
    HIGH:     { color: '#ef4444', size: 28, border: 2 },
    CRITICAL: { color: '#991b1b', size: 32, border: 3 },
};

export default function ReportMarker({ latitude, longitude, severity, onPress }: Props) {
    const cfg = SEVERITY_CONFIG[severity];
    const tipSize = cfg.size * 0.4;

    return (
        <Marker coordinate={{ latitude, longitude }} onPress={onPress} anchor={{ x: 0.5, y: 1 }}>
            <View style={{ alignItems: 'center' }}>
                {/* Circle head */}
                <View style={{
                    width: cfg.size,
                    height: cfg.size,
                    borderRadius: cfg.size / 2,
                    backgroundColor: cfg.color,
                    borderWidth: cfg.border,
                    borderColor: 'white',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 3,
                    elevation: 4,
                    zIndex: 1,
                }} />
                {/* Pin tip */}
                <View style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: tipSize / 2,
                    borderRightWidth: tipSize / 2,
                    borderTopWidth: tipSize,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderTopColor: cfg.color,
                    marginTop: -1,
                }} />
            </View>
        </Marker>
    );
}
