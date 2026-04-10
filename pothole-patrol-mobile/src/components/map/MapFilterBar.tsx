import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type MapFilter = 'All' | 'Has Minor' | 'Has Major' | 'Has Hazard' | 'Recent';

interface Props {
    activeFilter: MapFilter;
    onFilterChange: (filter: MapFilter) => void;
}

const FILTERS: MapFilter[] = ['All', 'Has Minor', 'Has Major', 'Has Hazard', 'Recent'];

export default function MapFilterBar({ activeFilter, onFilterChange }: Props) {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={{
                position: 'absolute',
                top: insets.top + 8,
                left: 0,
                right: 0,
                paddingHorizontal: 16,
            }}
        >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {FILTERS.map((f) => {
                    const active = activeFilter === f;
                    return (
                        <TouchableOpacity
                            key={f}
                            onPress={() => onFilterChange(f)}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 20,
                                backgroundColor: active ? '#2563EB' : 'rgba(255,255,255,0.95)',
                                borderWidth: 1,
                                borderColor: active ? '#2563EB' : 'rgba(0,0,0,0.08)',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.12,
                                shadowRadius: 3,
                                elevation: 3,
                            }}
                        >
                            <Text
                                style={{
                                    fontWeight: '600',
                                    fontSize: 13,
                                    color: active ? '#ffffff' : '#374151',
                                }}
                            >
                                {f}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}
