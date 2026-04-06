import { View, Text, TouchableOpacity } from 'react-native';
import { Severity } from '../../types/report.types';

interface Props {
    selected: Severity;
    onSelect: (severity: Severity) => void;
}

export default function SeveritySelector({ selected, onSelect }: Props) {
    const options: { id: Severity; label: string; activeColor: string }[] = [
        { id: 'LOW', label: 'Minor', activeColor: 'bg-green-500' },
        { id: 'MEDIUM', label: 'Major', activeColor: 'bg-orange-500' },
        { id: 'HIGH', label: 'Serious', activeColor: 'bg-red-500' },
        { id: 'CRITICAL', label: 'Hazard', activeColor: 'bg-red-950' },
    ];

    return (
        <View className="flex-row w-full justify-between gap-2">
            {options.map((opt) => (
                <TouchableOpacity
                    key={opt.id}
                    className={`flex-1 py-3 rounded-xl border items-center ${selected === opt.id ? `${opt.activeColor} border-transparent` : 'bg-white border-gray-200'
                        }`}
                    onPress={() => onSelect(opt.id)}
                >
                    <Text className={`font-semibold ${selected === opt.id ? 'text-white' : 'text-gray-700'}`}>
                        {opt.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}
