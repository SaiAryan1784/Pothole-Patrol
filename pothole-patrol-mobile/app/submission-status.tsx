/**
 * Submission Status Screen
 *
 * Shown immediately after a report is submitted.
 * Polls GET /v1/reports/<id>/ every 3 seconds until the ML pipeline resolves
 * the status (VERIFIED or REJECTED / NEEDS_REVIEW). Shows a live progress
 * indicator and then an animated result card.
 *
 * Max polling: 20 attempts (~60 s). After that shows "taking longer than usual"
 * and lets the user check back in the Feed later.
 */
import {
    View, Text, Image, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue, useAnimatedStyle,
    withSpring, withTiming, withSequence, withDelay,
} from 'react-native-reanimated';
import axiosClient from '../src/api/axiosClient';
import { Report, ReportStatus } from '../src/types/report.types';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

type Phase = 'polling' | 'verified' | 'needs_review' | 'rejected' | 'timeout';

const SEVERITY_LABELS: Record<string, string> = {
    LOW: 'Minor',
    MEDIUM: 'Major',
    HIGH: 'Serious',
    CRITICAL: 'Hazard',
};

function ResultIcon({ phase }: { phase: Phase }) {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 180 }));
        opacity.value = withDelay(100, withTiming(1, { duration: 200 }));
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const configs: Record<Phase, { bg: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
        verified:     { bg: '#dcfce7', icon: 'shield-checkmark', color: '#15803d' },
        needs_review: { bg: '#fef3c7', icon: 'hourglass',        color: '#b45309' },
        rejected:     { bg: '#fee2e2', icon: 'close-circle',     color: '#dc2626' },
        timeout:      { bg: '#f1f5f9', icon: 'time',             color: '#64748b' },
        polling:      { bg: '#eff6ff', icon: 'sync',             color: '#2563eb' },
    };

    const { bg, icon, color } = configs[phase];

    return (
        <Animated.View style={[{
            width: 96, height: 96, borderRadius: 48,
            backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
        }, style]}>
            <Ionicons name={icon} size={48} color={color} />
        </Animated.View>
    );
}

function PollingDots() {
    const op1 = useSharedValue(0.3);
    const op2 = useSharedValue(0.3);
    const op3 = useSharedValue(0.3);

    useEffect(() => {
        const seq = (delay: number, sv: typeof op1) => {
            sv.value = withDelay(delay, withSequence(
                withTiming(1, { duration: 400 }),
                withTiming(0.3, { duration: 400 }),
            ));
        };
        const loop = setInterval(() => {
            seq(0, op1);
            seq(200, op2);
            seq(400, op3);
        }, 1200);
        return () => clearInterval(loop);
    }, []);

    const dot = (sv: typeof op1) =>
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useAnimatedStyle(() => ({ opacity: sv.value }));

    return (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 12 }}>
            {[op1, op2, op3].map((sv, i) => (
                <Animated.View key={i} style={[{
                    width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb',
                }, dot(sv)]} />
            ))}
        </View>
    );
}

export default function SubmissionStatusScreen() {
    const { reportId, imageUrl } = useLocalSearchParams<{ reportId: string; imageUrl: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [phase, setPhase] = useState<Phase>('polling');
    const [report, setReport] = useState<Report | null>(null);
    const [pollCount, setPollCount] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!reportId) {
            setPhase('timeout');
            return;
        }

        const poll = async () => {
            setPollCount((c) => {
                if (c >= MAX_POLLS) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    setPhase('timeout');
                    return c;
                }
                return c + 1;
            });

            try {
                const res = await axiosClient.get<Report>(`/reports/${reportId}/`);
                const r = res.data;
                const terminal: ReportStatus[] = ['VERIFIED', 'REJECTED', 'NEEDS_REVIEW', 'REPAIRED'];
                if (terminal.includes(r.status)) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    setReport(r);
                    if (r.status === 'VERIFIED') setPhase('verified');
                    else if (r.status === 'NEEDS_REVIEW') setPhase('needs_review');
                    else setPhase('rejected');
                }
            } catch {
                // network hiccup — keep polling
            }
        };

        // First poll immediately, then every POLL_INTERVAL_MS
        poll();
        intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [reportId]);

    const title: Record<Phase, string> = {
        polling:      'Verifying your report…',
        verified:     'AI Verified!',
        needs_review: 'Sent for Review',
        rejected:     'Not Verified',
        timeout:      'Still processing…',
    };

    const subtitle: Record<Phase, string> = {
        polling:      'Our YOLOv8 model is checking the image for a pothole',
        verified:     'Your report has been confirmed and dispatched to civic authorities',
        needs_review: 'A moderator will review it shortly — it will appear in the Feed once approved',
        rejected:     'The AI couldn\'t detect a pothole clearly. Try a closer, better-lit photo',
        timeout:      'This is taking longer than usual. Check the Feed in a few minutes to see your report',
    };

    const subtitleColor: Record<Phase, string> = {
        polling:      '#64748b',
        verified:     '#15803d',
        needs_review: '#b45309',
        rejected:     '#dc2626',
        timeout:      '#64748b',
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: insets.top }}>
            {/* Header */}
            <View style={{
                paddingHorizontal: 16, paddingVertical: 12,
                backgroundColor: '#ffffff',
                borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
                flexDirection: 'row', alignItems: 'center', gap: 12,
            }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: '#0f172a' }}>Report Status</Text>
                </View>
            </View>

            <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 48 }}>
                {/* Photo */}
                {imageUrl ? (
                    <View style={{
                        width: 200, height: 150, borderRadius: 16, overflow: 'hidden',
                        marginBottom: 32,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
                    }}>
                        <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </View>
                ) : null}

                {/* Status icon */}
                <ResultIcon phase={phase} />

                {/* Title */}
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 20, textAlign: 'center' }}>
                    {title[phase]}
                </Text>

                {/* Polling animation */}
                {phase === 'polling' && <PollingDots />}

                {/* Subtitle */}
                <Text style={{
                    fontSize: 14, color: subtitleColor[phase],
                    textAlign: 'center', lineHeight: 22,
                    marginTop: phase === 'polling' ? 16 : 10,
                    maxWidth: 300,
                }}>
                    {subtitle[phase]}
                </Text>

                {/* Verified details card */}
                {phase === 'verified' && report && (
                    <View style={{
                        marginTop: 24, backgroundColor: '#f0fdf4',
                        borderRadius: 14, padding: 16, width: '100%',
                        borderWidth: 1, borderColor: '#bbf7d0',
                        gap: 8,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="shield-checkmark" size={16} color="#15803d" />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#15803d' }}>
                                AI Confidence: {Math.round(report.confidence * 100)}%
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="warning" size={16} color="#15803d" />
                            <Text style={{ fontSize: 13, color: '#166534' }}>
                                Severity: {SEVERITY_LABELS[report.severity] ?? report.severity}
                            </Text>
                        </View>
                        {(report.area_name || report.city) ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="location" size={16} color="#15803d" />
                                <Text style={{ fontSize: 13, color: '#166534' }} numberOfLines={1}>
                                    {[report.area_name, report.city].filter(Boolean).join(', ')}
                                </Text>
                            </View>
                        ) : null}
                        <Text style={{ fontSize: 12, color: '#4ade80', marginTop: 4 }}>
                            This report has been sent to the relevant civic authority.
                        </Text>
                    </View>
                )}

                {/* Rejected hint */}
                {phase === 'rejected' && (
                    <View style={{
                        marginTop: 20, backgroundColor: '#fff1f2',
                        borderRadius: 12, padding: 14, width: '100%',
                        borderWidth: 1, borderColor: '#fecdd3',
                        flexDirection: 'row', gap: 10,
                    }}>
                        <Ionicons name="bulb-outline" size={16} color="#dc2626" style={{ marginTop: 1 }} />
                        <Text style={{ flex: 1, fontSize: 13, color: '#991b1b', lineHeight: 20 }}>
                            Tips: get closer to the pothole, ensure good lighting, and avoid steep angles.
                        </Text>
                    </View>
                )}
            </View>

            {/* Bottom action */}
            <View style={{ padding: 24, paddingBottom: insets.bottom + 16, gap: 12 }}>
                {phase !== 'polling' && (
                    <TouchableOpacity
                        onPress={() => router.replace('/(tabs)')}
                        style={{
                            backgroundColor: '#2563EB', borderRadius: 14,
                            paddingVertical: 16, alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                            Back to Map
                        </Text>
                    </TouchableOpacity>
                )}
                {(phase === 'rejected') && (
                    <TouchableOpacity
                        onPress={() => router.replace('/(tabs)/report')}
                        style={{
                            backgroundColor: '#f1f5f9', borderRadius: 14,
                            paddingVertical: 16, alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: '#374151', fontWeight: '600', fontSize: 16 }}>
                            Try Again
                        </Text>
                    </TouchableOpacity>
                )}
                {phase === 'polling' && (
                    <TouchableOpacity
                        onPress={() => router.replace('/(tabs)')}
                        style={{ alignItems: 'center', paddingVertical: 8 }}
                    >
                        <Text style={{ color: '#94a3b8', fontSize: 14 }}>Skip — check later in Feed</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
