import {
    View, Text, FlatList, TouchableOpacity,
    ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ReportCard from '../../src/components/report/ReportCard';
import axiosClient from '../../src/api/axiosClient';
import { Report } from '../../src/types/report.types';
import { Severity } from '../../src/types/report.types';

// Cities with meaningful coverage — extended as ward data grows
const CITIES = ['All Cities', 'Delhi', 'Ghaziabad', 'Noida'];

const SEVERITIES: { label: string; value: Severity }[] = [
    { label: 'Minor',   value: 'LOW' },
    { label: 'Major',   value: 'MEDIUM' },
    { label: 'Serious', value: 'HIGH' },
    { label: 'Hazard',  value: 'CRITICAL' },
];

const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; activeBg: string }> = {
    LOW:      { bg: '#f0fdf4', text: '#166534', activeBg: '#22c55e' },
    MEDIUM:   { bg: '#fff7ed', text: '#9a3412', activeBg: '#f97316' },
    HIGH:     { bg: '#fef2f2', text: '#991b1b', activeBg: '#ef4444' },
    CRITICAL: { bg: '#450a0a', text: '#fca5a5', activeBg: '#b91c1c' },
};

interface FeedResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Report[];
}

function SeverityPill({
    item,
    active,
    onPress,
}: {
    item: typeof SEVERITIES[number];
    active: boolean;
    onPress: () => void;
}) {
    const c = SEVERITY_COLORS[item.value];
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: active ? c.activeBg : c.bg,
                borderWidth: 1,
                borderColor: active ? c.activeBg : 'transparent',
            }}
        >
            <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: active ? '#ffffff' : c.text,
            }}>
                {item.label.toUpperCase()}
            </Text>
        </TouchableOpacity>
    );
}

export default function FeedScreen() {
    const insets = useSafeAreaInsets();
    const [reports, setReports] = useState<Report[]>([]);
    const [selectedCity, setSelectedCity] = useState('All Cities');
    const [activeSeverities, setActiveSeverities] = useState<Set<Severity>>(new Set());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [nextUrl, setNextUrl] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const pageRef = useRef(1);

    const buildParams = useCallback((page: number) => {
        const params: Record<string, string> = { page: String(page) };
        if (selectedCity !== 'All Cities') params.city = selectedCity;
        if (activeSeverities.size > 0) params.severity = [...activeSeverities].join(',');
        return params;
    }, [selectedCity, activeSeverities]);

    const loadPage = useCallback(async (page: number, replace: boolean) => {
        try {
            const res = await axiosClient.get<FeedResponse>('/reports/feed/', {
                params: buildParams(page),
            });
            const data = res.data;
            setReports((prev) => replace ? data.results : [...prev, ...data.results]);
            setNextUrl(data.next);
            pageRef.current = page;
        } catch {
            // keep existing data on error
        }
    }, [buildParams]);

    const refresh = useCallback(async () => {
        setRefreshing(true);
        await loadPage(1, true);
        setRefreshing(false);
    }, [loadPage]);

    useEffect(() => {
        setLoading(true);
        loadPage(1, true).finally(() => setLoading(false));
    }, [selectedCity, activeSeverities]);

    const loadMore = useCallback(async () => {
        if (!nextUrl || loadingMore) return;
        setLoadingMore(true);
        await loadPage(pageRef.current + 1, false);
        setLoadingMore(false);
    }, [nextUrl, loadingMore, loadPage]);

    const toggleSeverity = (sev: Severity) => {
        setActiveSeverities((prev) => {
            const next = new Set(prev);
            next.has(sev) ? next.delete(sev) : next.add(sev);
            return next;
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: insets.top }}>
            {/* Header */}
            <View style={{
                paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
                backgroundColor: '#ffffff',
                borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a', flex: 1 }}>
                        Pothole Feed
                    </Text>
                    <TouchableOpacity onPress={() => setShowInfo((v) => !v)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                        <Ionicons name="information-circle-outline" size={22} color="#64748b" />
                    </TouchableOpacity>
                </View>
                {showInfo && (
                    <View style={{
                        backgroundColor: '#eff6ff', borderRadius: 10, padding: 10, marginBottom: 8,
                        flexDirection: 'row', alignItems: 'flex-start', gap: 6,
                    }}>
                        <Ionicons name="shield-checkmark" size={14} color="#2563eb" style={{ marginTop: 1 }} />
                        <Text style={{ fontSize: 12, color: '#1e40af', lineHeight: 18, flex: 1 }}>
                            Every pothole shown here has been cross-checked by our YOLOv8 AI model before appearing in the feed.
                        </Text>
                    </View>
                )}

                {/* City selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
                    {CITIES.map((city) => {
                        const active = selectedCity === city;
                        return (
                            <TouchableOpacity
                                key={city}
                                onPress={() => setSelectedCity(city)}
                                activeOpacity={0.8}
                                style={{
                                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                                    backgroundColor: active ? '#2563EB' : '#f1f5f9',
                                    borderWidth: 1,
                                    borderColor: active ? '#2563EB' : 'transparent',
                                }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#ffffff' : '#374151' }}>
                                    {city}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Severity filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {SEVERITIES.map((item) => (
                        <SeverityPill
                            key={item.value}
                            item={item}
                            active={activeSeverities.has(item.value)}
                            onPress={() => toggleSeverity(item.value)}
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Feed list */}
            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={reports}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, gap: 12 }}
                    renderItem={({ item }) => <ReportCard report={item} />}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#2563EB" />}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                        loadingMore
                            ? <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 16 }} />
                            : null
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
                            <Ionicons name="checkmark-circle-outline" size={48} color="#cbd5e1" />
                            <Text style={{ fontSize: 15, color: '#94a3b8', fontWeight: '500' }}>No verified reports here yet</Text>
                            <Text style={{ fontSize: 13, color: '#cbd5e1' }}>Be the first to report a pothole</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
