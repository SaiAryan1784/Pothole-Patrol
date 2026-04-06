import { View, Text } from 'react-native';
import { Severity } from '../../types/report.types';
import { SEVERITY_LEVELS } from '../../constants/severity';

export default function SeverityBadge({ severity }: { severity: Severity }) {
    const bgColors: Record<Severity, string> = {
        LOW: 'bg-green-100',
        MEDIUM: 'bg-orange-100',
        HIGH: 'bg-red-100',
        CRITICAL: 'bg-red-950',
    };
    const textColors: Record<Severity, string> = {
        LOW: 'text-green-800',
        MEDIUM: 'text-orange-800',
        HIGH: 'text-red-800',
        CRITICAL: 'text-white',
    };
    const level = SEVERITY_LEVELS[severity];
    return (
        <View className={`px-3 py-1 rounded-full ${bgColors[severity]}`}>
            <Text className={`font-medium ${textColors[severity]}`}>{level.label.toUpperCase()}</Text>
        </View>
    );
}
