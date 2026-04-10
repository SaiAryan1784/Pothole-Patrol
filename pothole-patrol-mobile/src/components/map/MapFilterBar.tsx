import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type MapFilter = 'All' | 'Has Minor' | 'Has Major' | 'Has Hazard' | 'Recent';

interface Props {
    activeFilter: MapFilter;
    onFilterChange: (filter: MapFilter) => void;
}

interface FilterConfig {
    label: MapFilter;
    dot?: string;
    icon?: keyof typeof Ionicons.glyphMap;
}

const FILTERS: FilterConfig[] = [
    { label: 'All' },
    { label: 'Has Minor',  dot: '#22c55e' },
    { label: 'Has Major',  dot: '#f97316' },
    { label: 'Has Hazard', dot: '#ef4444' },
    { label: 'Recent',     icon: 'time-outline' },
];

export default function MapFilterBar({ activeFilter, onFilterChange }: Props) {
    const insets = useSafeAreaInsets();

    return (
        <View style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, paddingHorizontal: 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {FILTERS.map(({ label, dot, icon }) => {
                    const active = activeFilter === label;
                    return (
                        <TouchableOpacity
                            key={label}
                            onPress={() => onFilterChange(label)}
                            activeOpacity={0.8}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 5,
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 20,
                                backgroundColor: active ? '#2563EB' : 'rgba(255,255,255,0.97)',
                                borderWidth: 1,
                                borderColor: active ? '#2563EB' : 'rgba(0,0,0,0.07)',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: active ? 3 : 1 },
                                shadowOpacity: active ? 0.22 : 0.10,
                                shadowRadius: active ? 6 : 3,
                                elevation: active ? 6 : 3,
                            }}
                        >
                            {/* Severity dot */}
                            {dot && (
                                <View style={{
                                    width: 7, height: 7, borderRadius: 4,
                                    backgroundColor: active ? 'rgba(255,255,255,0.85)' : dot,
                                }} />
                            )}
                            {/* Clock icon for Recent */}
                            {icon && (
                                <Ionicons name={icon} size={12} color={active ? 'rgba(255,255,255,0.9)' : '#64748b'} />
                            )}
                            <Text style={{
                                fontWeight: '600',
                                fontSize: 13,
                                color: active ? '#ffffff' : '#374151',
                            }}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}
