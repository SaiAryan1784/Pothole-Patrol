import { useMemo } from 'react';
import { Heatmap } from 'react-native-maps';
import { useReportsStore } from '../../store/reportsStore';

const GRADIENT = {
    colors: ['transparent', 'rgba(0, 255, 0, 0.5)', 'rgba(255, 165, 0, 0.8)', 'rgba(255, 0, 0, 1)'],
    startPoints: [0, 0.25, 0.5, 1],
    colorMapSize: 256,
};

interface Props {
    recentOnly?: boolean;
}

export default function HeatmapLayer({ recentOnly = false }: Props) {
    const heatmapData = useReportsStore((state) => state.heatmapData);
    const reports = useReportsStore((state) => state.reports);

    const recentPoints = useMemo(() => {
        const cutoff = Date.now() - 86400000; // last 24 hours
        return reports
            .filter((r) => new Date(r.created_at).getTime() >= cutoff)
            .map((r) => ({ latitude: r.latitude, longitude: r.longitude, weight: r.upvotes + 1 }));
    }, [reports]);

    const points = recentOnly ? recentPoints : heatmapData;

    if (!points || points.length === 0) return null;

    return (
        <Heatmap
            points={points}
            radius={20}
            opacity={0.7}
            gradient={GRADIENT}
        />
    );
}
