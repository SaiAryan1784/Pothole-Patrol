import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Report } from '../../types/report.types';

const SEVERITY_CONFIG = {
    LOW:      { label: 'Minor',    bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
    MEDIUM:   { label: 'Major',    bg: '#ffedd5', text: '#9a3412', dot: '#f97316' },
    HIGH:     { label: 'Serious',  bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
    CRITICAL: { label: 'Hazard',   bg: '#450a0a', text: '#fca5a5', dot: '#b91c1c' },
};

const STATUS_CONFIG = {
    PENDING:      { label: 'Pending review',  color: '#64748b' },
    NEEDS_REVIEW: { label: 'Under review',    color: '#d97706' },
    VERIFIED:     { label: 'Verified',        color: '#16a34a' },
    REJECTED:     { label: 'Not verified',    color: '#dc2626' },
    REPAIRED:     { label: 'Repaired',        color: '#2563eb' },
};

export default function ReportCard({ report }: { report: Report }) {
    const sev = SEVERITY_CONFIG[report.severity];
    const st = STATUS_CONFIG[report.status];
    const date = new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <View style={{ backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', marginTop: 4 }}>
            {/* Photo */}
            {report.image_url ? (
                <Image
                    source={{ uri: report.image_url }}
                    style={{ width: '100%', height: 160 }}
                    resizeMode="cover"
                />
            ) : null}

            <View style={{ padding: 14 }}>
                {/* Severity + Status row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    {/* Severity badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: sev.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 5 }}>
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: sev.dot }} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: sev.text, letterSpacing: 0.4 }}>
                            {sev.label.toUpperCase()}
                        </Text>
                    </View>

                    {/* Status */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons
                            name={report.status === 'VERIFIED' ? 'checkmark-circle' : report.status === 'REPAIRED' ? 'construct' : 'time-outline'}
                            size={14}
                            color={st.color}
                        />
                        <Text style={{ fontSize: 12, color: st.color, fontWeight: '600' }}>{st.label}</Text>
                    </View>
                </View>

                {/* Description */}
                <Text style={{ fontSize: 14, color: '#334155', lineHeight: 20, marginBottom: 10 }}>
                    {report.description || 'Pothole reported at this location.'}
                </Text>

                {/* Footer */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 }}>
                    <Ionicons name="calendar-outline" size={13} color="#94a3b8" />
                    <Text style={{ fontSize: 12, color: '#94a3b8' }}>{date}</Text>
                    <View style={{ flex: 1 }} />
                    <Ionicons name="thumbs-up-outline" size={13} color="#94a3b8" />
                    <Text style={{ fontSize: 12, color: '#94a3b8' }}>{report.upvotes}</Text>
                </View>
            </View>
        </View>
    );
}
