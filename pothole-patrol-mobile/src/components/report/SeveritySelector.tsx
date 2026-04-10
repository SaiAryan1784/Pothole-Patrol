import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Severity } from '../../types/report.types';

interface Option {
    id: Severity;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    activeBg: string;
    activeText: string;
}

const OPTIONS: Option[] = [
    { id: 'LOW',      label: 'Minor',   icon: 'alert-circle-outline', color: '#22c55e', activeBg: '#dcfce7', activeText: '#166534' },
    { id: 'MEDIUM',   label: 'Major',   icon: 'warning-outline',      color: '#f97316', activeBg: '#ffedd5', activeText: '#9a3412' },
    { id: 'HIGH',     label: 'Serious', icon: 'alert',                color: '#ef4444', activeBg: '#fee2e2', activeText: '#991b1b' },
    { id: 'CRITICAL', label: 'Hazard',  icon: 'flash',                color: '#b91c1c', activeBg: '#1c0202', activeText: '#fca5a5' },
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
                        activeOpacity={0.75}
                        style={{
                            flex: 1,
                            borderRadius: 12,
                            overflow: 'hidden',
                            backgroundColor: active ? opt.activeBg : '#ffffff',
                            borderWidth: 1.5,
                            borderColor: active ? opt.color : '#e2e8f0',
                            transform: [{ scale: active ? 1.04 : 1 }],
                        }}
                    >
                        {/* Colored top accent bar */}
                        <View style={{
                            height: 4,
                            backgroundColor: opt.color,
                            opacity: active ? 1 : 0.35,
                        }} />

                        <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                            <Ionicons
                                name={opt.icon}
                                size={20}
                                color={active ? opt.color : '#94a3b8'}
                            />
                            <Text style={{
                                fontSize: 10,
                                fontWeight: '700',
                                letterSpacing: 0.4,
                                marginTop: 4,
                                color: active ? opt.activeText : '#64748b',
                            }}>
                                {opt.label.toUpperCase()}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
