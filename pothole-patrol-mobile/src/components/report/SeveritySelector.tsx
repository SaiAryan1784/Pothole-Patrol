import { View, Text, TouchableOpacity } from 'react-native';
import { Severity } from '../../types/report.types';

interface Option {
    id: Severity;
    label: string;
    emoji: string;
    activeBg: string;
    activeText: string;
}

const OPTIONS: Option[] = [
    { id: 'LOW',      label: 'Minor',   emoji: '🟢', activeBg: '#dcfce7', activeText: '#166534' },
    { id: 'MEDIUM',   label: 'Major',   emoji: '🟠', activeBg: '#ffedd5', activeText: '#9a3412' },
    { id: 'HIGH',     label: 'Serious', emoji: '🔴', activeBg: '#fee2e2', activeText: '#991b1b' },
    { id: 'CRITICAL', label: 'Hazard',  emoji: '💀', activeBg: '#1c0202', activeText: '#fca5a5' },
];

interface Props {
    selected: Severity;
    onSelect: (severity: Severity) => void;
}

export default function SeveritySelector({ selected, onSelect }: Props) {
    return (
        <View style={{ flexDirection: 'row', gap: 8 }}>
            {OPTIONS.map((opt) => {
                const active = selected === opt.id;
                return (
                    <TouchableOpacity
                        key={opt.id}
                        onPress={() => onSelect(opt.id)}
                        style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 12,
                            alignItems: 'center',
                            backgroundColor: active ? opt.activeBg : '#ffffff',
                            borderWidth: 1.5,
                            borderColor: active ? opt.activeBg : '#e2e8f0',
                        }}
                    >
                        <Text style={{ fontSize: 18, marginBottom: 4 }}>{opt.emoji}</Text>
                        <Text style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: active ? opt.activeText : '#64748b',
                            letterSpacing: 0.3,
                        }}>
                            {opt.label.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
