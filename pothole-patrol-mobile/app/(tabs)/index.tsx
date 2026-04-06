import { View, TouchableOpacity, Text } from 'react-native';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import MapFilterBar, { MapFilter } from '../../src/components/map/MapFilterBar';
import HeatmapLayer from '../../src/components/map/HeatmapLayer';
import ReportMarker from '../../src/components/map/ReportMarker';
import ReportCard from '../../src/components/report/ReportCard';
import { useLocation } from '../../src/hooks/useLocation';
import { useReportsStore } from '../../src/store/reportsStore';
import { Report } from '../../src/types/report.types';

function applyFilter(reports: Report[], filter: MapFilter): Report[] {
    const now = Date.now();
    switch (filter) {
        case 'Has Minor':   return reports.filter(r => r.severity === 'LOW');
        case 'Has Major':   return reports.filter(r => r.severity === 'MEDIUM' || r.severity === 'HIGH');
        case 'Has Hazard':  return reports.filter(r => r.severity === 'CRITICAL');
        case 'Recent':      return reports.filter(r => now - new Date(r.created_at).getTime() < 86400000);
        default:            return reports;
    }
}

export default function HomeMapScreen() {
    const router = useRouter();
    const { location } = useLocation();
    const { reports, fetchHeatmapData, fetchNearbyReports } = useReportsStore();
    const [activeFilter, setActiveFilter] = useState<MapFilter>('All');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const bottomSheetRef = useRef<BottomSheetModal>(null);

    useEffect(() => {
        if (location) {
            const lat = location.coords.latitude;
            const lng = location.coords.longitude;
            fetchHeatmapData(lat, lng);
            fetchNearbyReports(lat, lng);
        }
    }, [location]);

    const handleMarkerPress = useCallback((report: Report) => {
        setSelectedReport(report);
        bottomSheetRef.current?.present();
    }, []);

    const filteredReports = applyFilter(reports, activeFilter);

    const initialRegion = {
        latitude: location?.coords.latitude ?? 28.6139,
        longitude: location?.coords.longitude ?? 77.2090,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    };

    return (
        <View className="flex-1 bg-gray-100">
            <MapView
                provider={PROVIDER_GOOGLE}
                className="flex-1"
                initialRegion={initialRegion}
                showsUserLocation
            >
                <HeatmapLayer />
                {filteredReports.map((report) => (
                    <ReportMarker
                        key={report.id}
                        latitude={report.latitude}
                        longitude={report.longitude}
                        severity={report.severity}
                        onPress={() => handleMarkerPress(report)}
                    />
                ))}
            </MapView>

            <MapFilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />

            <TouchableOpacity
                className="absolute bottom-6 self-center bg-blue-600 w-16 h-16 rounded-full items-center justify-center shadow-lg"
                onPress={() => router.push('/(tabs)/report')}
            >
                <Text className="text-white text-4xl leading-none mt-1">+</Text>
            </TouchableOpacity>

            <BottomSheetModal ref={bottomSheetRef} snapPoints={['45%']} enablePanDownToClose>
                <View className="flex-1 px-4 pt-2">
                    {selectedReport && <ReportCard report={selectedReport} />}
                </View>
            </BottomSheetModal>
        </View>
    );
}
