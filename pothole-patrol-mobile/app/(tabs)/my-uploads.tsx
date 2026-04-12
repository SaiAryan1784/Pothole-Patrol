import {
    View, Text, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '../../src/api/axiosClient';
import { Report, ReportStatus } from '../../src/types/report.types';
import { useAuthStore } from '../../src/store/authStore';

const STATUS_CONFIG: Record<ReportStatus, {
    label: string; color: string; bg: string;
    icon: 'time-outline' | 'hourglass-outline' | 'checkmark-circle' | 'close-circle-outline' | 'construct';
}> = {
    PENDING:      { label: 'Verifying…',    color: '#2563eb', bg: '#eff6ff', icon: 'time-outline' },
    NEEDS_REVIEW: { label: 'Under Review',  color: '#b45309', bg: '#fef3c7', icon: 'hourglass-outline' },
    VERIFIED:     { label: 'AI Verified',   color: '#15803d', bg: '#dcfce7', icon: 'checkmark-circle' },
    REJECTED:     { label: 'Rejected',      color: '#dc2626', bg: '#fee2e2', icon: 'close-circle-outline' },
    REPAIRED:     { label: 'Repaired',      color: '#2563eb', bg: '#dbeafe', icon: 'construct' },
};

const SEVERITY_LABELS: Record<string, string> = {
    LOW: 'Minor', MEDIUM: 'Major', HIGH: 'Serious', CRITICAL: 'Hazard',
};

// Statuses that are still being processed
const PENDING_STATUSES: ReportStatus[] = ['PENDING'];

function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function UploadCard({
    report,
    onPress,
}: {
    report: Report;
    onPress: () => void;
}) {
    const st = STATUS_CONFIG[report.status];

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            style={{
                backgroundColor: '#ffffff',
                borderRadius: 14,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.07,
                shadowRadius: 6,
                elevation: 3,
                flexDirection: 'row',
            }}
        >
            {/* Thumbnail */}
            <View style={{ width: 88, height: 88 }}>
                {report.image_url ? (
                    <Image
                        source={{ uri: report.image_url }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={{ flex: 1, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="image-outline" size={28} color="#cbd5e1" />
                    </View>
                )}
            </View>

            {/* Info */}
            <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Status badge */}
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        backgroundColor: st.bg, paddingHorizontal: 8,
                        paddingVertical: 3, borderRadius: 20,
                    }}>
                        {report.status === 'PENDING' ? (
                            <ActivityIndicator size="small" color={st.color} style={{ transform: [{ scale: 0.6 }] }} />
                        ) : (
                            <Ionicons name={st.icon} size={11} color={st.color} />
                        )}
                        <Text style={{ fontSize: 11, fontWeight: '600', color: st.color }}>
                            {st.label}
                        </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
                        {relativeTime(report.created_at)}
                    </Text>
                </View>

                <Text style={{ fontSize: 13, color: '#475569', marginTop: 4 }} numberOfLines={1}>
                    {SEVERITY_LABELS[report.severity] ?? report.severity} pothole
                    {(report.area_name || report.city)
                        ? ` · ${[report.area_name, report.city].filter(Boolean).join(', ')}`
                        : ''}
                </Text>

                {report.status === 'VERIFIED' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Ionicons name="shield-checkmark" size={11} color="#15803d" />
                        <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '600' }}>
                            {Math.round(report.confidence * 100)}% confidence
                        </Text>
                    </View>
                )}

                {report.status === 'REJECTED' && (
                    <Text style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                        Pothole not detected — try a closer photo
                    </Text>
                )}
            </View>

            <View style={{ justifyContent: 'center', paddingRight: 12 }}>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </View>
        </TouchableOpacity>
    );
}

export default function MyUploadsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { firebaseUser } = useAuthStore();

    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchReports = useCallback(async () => {
        try {
            const res = await axiosClient.get<Report[]>('/reports/mine/');
            setReports(Array.isArray(res.data) ? res.data : (res.data as { results?: Report[] }).results ?? []);
        } catch {
            // keep existing data
        }
    }, []);

    const refresh = useCallback(async () => {
        setRefreshing(true);
        await fetchReports();
        setRefreshing(false);
    }, [fetchReports]);

    // Initial load
    useEffect(() => {
        setLoading(true);
        fetchReports().finally(() => setLoading(false));
    }, [fetchReports]);

    // Live polling for PENDING reports — re-poll every 5 s while any exist
    useEffect(() => {
        const hasPending = reports.some((r) => PENDING_STATUSES.includes(r.status));
        if (hasPending) {
            pollRef.current = setInterval(fetchReports, 5000);
        } else {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [reports, fetchReports]);

    const handleCardPress = (report: Report) => {
        if (report.status === 'PENDING' || report.status === 'NEEDS_REVIEW') {
            router.push({
                pathname: '/submission-status',
                params: { reportId: String(report.id), imageUrl: report.image_url },
            });
        }
        // For terminal states (VERIFIED/REJECTED/REPAIRED), just show the card as-is
    };

    if (!firebaseUser) {
        return (
            <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                <Ionicons name="person-circle-outline" size={64} color="#cbd5e1" />
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#1e293b', marginTop: 16, textAlign: 'center' }}>
                    Not signed in
                </Text>
                <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 }}>
                    Your reports will appear here once you submit one
                </Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: insets.top }}>
            {/* Header */}
            <View style={{
                paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
                backgroundColor: '#ffffff',
                borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
            }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>
                    My Reports
                </Text>
                <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                    {reports.length === 0 ? 'No reports yet' : `${reports.length} report${reports.length === 1 ? '' : 's'}`}
                </Text>
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={reports}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, gap: 10 }}
                    renderItem={({ item }) => (
                        <UploadCard report={item} onPress={() => handleCardPress(item)} />
                    )}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#2563EB" />
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', paddingTop: 80, gap: 12 }}>
                            <Ionicons name="camera-outline" size={56} color="#cbd5e1" />
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#94a3b8' }}>
                                No reports yet
                            </Text>
                            <Text style={{ fontSize: 13, color: '#cbd5e1', textAlign: 'center', maxWidth: 240 }}>
                                Tap the Report tab to photograph and submit a pothole
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push('/(tabs)/report')}
                                style={{
                                    marginTop: 8, backgroundColor: '#2563EB',
                                    paddingHorizontal: 24, paddingVertical: 12,
                                    borderRadius: 12,
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                                    Report a Pothole
                                </Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
}
