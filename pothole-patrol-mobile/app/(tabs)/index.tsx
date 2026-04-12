import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import MapFilterBar, { MapFilter } from '../../src/components/map/MapFilterBar';
import HeatmapLayer from '../../src/components/map/HeatmapLayer';
import { useLocation } from '../../src/hooks/useLocation';
import { useReportsStore } from '../../src/store/reportsStore';
import axiosClient from '../../src/api/axiosClient';

interface AppStats {
    verified_reports: number;
    total_reports: number;
    cities_covered: number;
    total_upvotes: number;
}

function formatCount(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}

function StatsStrip({ stats }: { stats: AppStats | null }) {
    if (!stats) return null;
    return (
        <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: 'rgba(255,255,255,0.96)',
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(37,99,235,0.10)',
        }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="shield-checkmark" size={13} color="#15803d" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#15803d' }}>
                    {formatCount(stats.verified_reports)}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748b' }}>verified</Text>
            </View>
            <View style={{ width: 1, height: 14, backgroundColor: '#e2e8f0' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="thumbs-up" size={13} color="#2563eb" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563eb' }}>
                    {formatCount(stats.total_upvotes)}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748b' }}>upvotes</Text>
            </View>
            <View style={{ width: 1, height: 14, backgroundColor: '#e2e8f0' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="location" size={13} color="#7c3aed" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#7c3aed' }}>
                    {stats.cities_covered || stats.total_reports}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748b' }}>
                    {stats.cities_covered ? 'cities' : 'reports'}
                </Text>
            </View>
        </View>
    );
}

function FabPulse() {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.5);

    useEffect(() => {
        scale.value = withRepeat(withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
        opacity.value = withRepeat(withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[{
            position: 'absolute',
            width: '100%', height: '100%',
            borderRadius: 32,
            backgroundColor: 'rgba(37,99,235,0.35)',
        }, style]} />
    );
}

export default function HomeMapScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { location, errorMsg } = useLocation();
    const { fetchHeatmapData, fetchNearbyReports } = useReportsStore();
    const [activeFilter, setActiveFilter] = useState<MapFilter>('All');
    const [mapReady, setMapReady] = useState(false);
    const [stats, setStats] = useState<AppStats | null>(null);
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        if (location) {
            fetchHeatmapData(location.coords.latitude, location.coords.longitude);
            fetchNearbyReports(location.coords.latitude, location.coords.longitude);
        }
    }, [location]);

    useEffect(() => {
        axiosClient.get<AppStats>('/stats/')
            .then((res) => setStats(res.data))
            .catch(() => { /* silently hide strip on error */ });
    }, []);

    const centerOnUser = () => {
        if (location && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 500);
        }
    };

    return (
        <View style={{ flex: 1, paddingTop: insets.top }}>
            {/* Stats strip — sits in the layout flow (not absolute) */}
            <StatsStrip stats={stats} />

            {/* Map fills remaining space */}
            <View style={{ flex: 1 }}>
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={{ flex: 1 }}
                    initialRegion={{
                        latitude: location?.coords.latitude ?? 28.6139,
                        longitude: location?.coords.longitude ?? 77.2090,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                    showsUserLocation
                    showsMyLocationButton={false}
                    onMapReady={() => setMapReady(true)}
                >
                    {mapReady && <HeatmapLayer recentOnly={activeFilter === 'Recent'} />}
                </MapView>

                {/* Map loading overlay */}
                {!mapReady && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color="#2563EB" />
                        <Text style={{ marginTop: 12, color: '#64748b', fontSize: 14, fontWeight: '500' }}>Loading map…</Text>
                    </View>
                )}

                {/* Location error toast */}
                {errorMsg && (
                    <View style={{
                        position: 'absolute', top: 56, alignSelf: 'center',
                        backgroundColor: 'rgba(239,68,68,0.92)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                    }}>
                        <Text style={{ color: 'white', fontSize: 13, fontWeight: '500' }}>Location unavailable — showing Delhi</Text>
                    </View>
                )}

                {/* Filter bar — floats over the map */}
                <MapFilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />

                {/* My Location button */}
                <TouchableOpacity
                    onPress={centerOnUser}
                    style={{
                        position: 'absolute', bottom: 100, right: 20,
                        backgroundColor: 'white', width: 44, height: 44, borderRadius: 22,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 1, borderColor: '#dbeafe',
                        shadowColor: '#2563EB', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15, shadowRadius: 6, elevation: 5,
                    }}
                >
                    <Ionicons name="locate-outline" size={22} color="#2563EB" />
                </TouchableOpacity>

                {/* Report FAB with pulse ring */}
                <View style={{
                    position: 'absolute', bottom: 100, alignSelf: 'center',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <FabPulse />
                    <TouchableOpacity
                        onPress={() => router.push('/(tabs)/report')}
                        style={{
                            backgroundColor: '#2563EB',
                            flexDirection: 'row', alignItems: 'center', gap: 8,
                            paddingHorizontal: 24, paddingVertical: 14, borderRadius: 32,
                            shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
                        }}
                    >
                        <Ionicons name="camera" size={20} color="white" />
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 }}>
                            Report Pothole
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
