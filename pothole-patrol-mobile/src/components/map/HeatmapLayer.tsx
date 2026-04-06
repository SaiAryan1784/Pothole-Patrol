import { Heatmap } from 'react-native-maps';
import { useReportsStore } from '../../store/reportsStore';

export default function HeatmapLayer() {
    const heatmapData = useReportsStore((state) => state.heatmapData);

    if (!heatmapData || heatmapData.length === 0) return null;

    return (
        <Heatmap
            points={heatmapData}
            radius={20}
            opacity={0.7}
            gradient={{
                colors: ['transparent', 'rgba(0, 255, 0, 0.5)', 'rgba(255, 165, 0, 0.8)', 'rgba(255, 0, 0, 1)'],
                startPoints: [0, 0.25, 0.5, 1],
                colorMapSize: 256,
            }}
        />
    );
}
