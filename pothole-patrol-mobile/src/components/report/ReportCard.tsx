import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Report } from '../../types/report.types';

const SEVERITY_CONFIG = {
    LOW:      { label: 'Minor',    bg: '#dcfce7', text: '#166534', bar: '#22c55e' },
    MEDIUM:   { label: 'Major',    bg: '#ffedd5', text: '#9a3412', bar: '#f97316' },
    HIGH:     { label: 'Serious',  bg: '#fee2e2', text: '#991b1b', bar: '#ef4444' },
    CRITICAL: { label: 'Hazard',   bg: '#450a0a', text: '#fca5a5', bar: '#b91c1c' },
};

const STATUS_CONFIG = {
    PENDING:      { label: 'Pending review', color: '#64748b', bg: '#f1f5f9', icon: 'time-outline' as const },
    NEEDS_REVIEW: { label: 'Under review',   color: '#b45309', bg: '#fef3c7', icon: 'hourglass-outline' as const },
    VERIFIED:     { label: 'Verified',       color: '#15803d', bg: '#dcfce7', icon: 'checkmark-circle' as const },
    REJECTED:     { label: 'Not verified',   color: '#dc2626', bg: '#fee2e2', icon: 'close-circle-outline' as const },
    REPAIRED:     { label: 'Repaired',       color: '#2563eb', bg: '#dbeafe', icon: 'construct' as const },
};

function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ReportCard({ report }: { report: Report }) {
    const sev = SEVERITY_CONFIG[report.severity];
    const st = STATUS_CONFIG[report.status];

    return (
        <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            overflow: 'hidden',
            marginTop: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07,
            shadowRadius: 8,
            elevation: 3,
        }}>
            {/* Photo with overlay */}
            {report.image_url ? (
                <View style={{ height: 168, position: 'relative' }}>
                    <Image
                        source={{ uri: report.image_url }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                    {/* Gradient overlay — bottom 40% */}
                    <View style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 68,
                        backgroundColor: 'rgba(0,0,0,0.52)',
                    }} />
                    {/* Severity badge floats on photo */}
                    <View style={{
                        position: 'absolute', bottom: 10, left: 12,
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: sev.bg,
                        paddingHorizontal: 10, paddingVertical: 4,
                        borderRadius: 20, gap: 5,
                    }}>
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: sev.bar }} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: sev.text, letterSpacing: 0.5 }}>
                            {sev.label.toUpperCase()}
                        </Text>
                    </View>
                </View>
            ) : null}

            {/* Left severity bar + content */}
            <View style={{ flexDirection: 'row' }}>
                <View style={{ width: 4, backgroundColor: sev.bar }} />

                <View style={{ flex: 1, padding: 14 }}>
                    {/* Status pill */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 4,
                            backgroundColor: st.bg,
                            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
                        }}>
                            <Ionicons name={st.icon} size={12} color={st.color} />
                            <Text style={{ fontSize: 11, fontWeight: '600', color: st.color }}>{st.label}</Text>
                        </View>
                    </View>

                    {/* Location line */}
                    {(report.area_name || report.city) ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                            <Ionicons name="location-outline" size={12} color="#64748b" />
                            <Text style={{ fontSize: 12, color: '#64748b' }} numberOfLines={1}>
                                {[report.area_name, report.city].filter(Boolean).join(', ')}
                            </Text>
                        </View>
                    ) : null}

                    {/* Description */}
                    <Text style={{ fontSize: 14, color: '#334155', lineHeight: 20, marginBottom: 10 }}>
                        {report.description || 'Pothole reported at this location.'}
                    </Text>

                    {/* Footer */}
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10,
                    }}>
                        <Ionicons name="time-outline" size={12} color="#94a3b8" />
                        <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                            reported {relativeTime(report.created_at)}
                        </Text>
                        <View style={{ flex: 1 }} />
                        {report.status === 'VERIFIED' ? (
                            <View style={{
                                flexDirection: 'row', alignItems: 'center', gap: 3,
                                backgroundColor: '#dcfce7', paddingHorizontal: 7, paddingVertical: 2,
                                borderRadius: 12, marginRight: 8,
                            }}>
                                <Ionicons name="shield-checkmark" size={11} color="#15803d" />
                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#15803d' }}>
                                    AI Verified · {Math.round(report.confidence * 100)}%
                                </Text>
                            </View>
                        ) : null}
                        <Ionicons name="thumbs-up-outline" size={12} color="#94a3b8" />
                        <Text style={{ fontSize: 12, color: '#94a3b8', marginLeft: 3 }}>{report.upvotes}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}
