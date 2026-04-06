import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

export type MapFilter = 'All' | 'Has Minor' | 'Has Major' | 'Has Hazard' | 'Recent';

interface Props {
    activeFilter: MapFilter;
    onFilterChange: (filter: MapFilter) => void;
}

const FILTERS: MapFilter[] = ['All', 'Has Minor', 'Has Major', 'Has Hazard', 'Recent'];

export default function MapFilterBar({ activeFilter, onFilterChange }: Props) {
    return (
        <View className="absolute top-12 w-full px-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {FILTERS.map((f) => (
                    <TouchableOpacity
                        key={f}
                        className={`px-4 py-2 rounded-full mr-2 shadow-sm border ${
                            activeFilter === f
                                ? 'bg-blue-600 border-blue-600'
                                : 'bg-white border-gray-100'
                        }`}
                        onPress={() => onFilterChange(f)}
                    >
                        <Text className={`font-medium ${activeFilter === f ? 'text-white' : 'text-gray-700'}`}>
                            {f}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}
