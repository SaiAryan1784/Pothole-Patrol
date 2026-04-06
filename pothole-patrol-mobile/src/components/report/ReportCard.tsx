import { View, Text, Image } from 'react-native';
import { Report } from '../../types/report.types';
import SeverityBadge from '../ui/SeverityBadge';
import UpvoteButton from './UpvoteButton';

export default function ReportCard({ report }: { report: Report }) {
    return (
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <View className="flex-row justify-between items-start mb-3">
                <SeverityBadge severity={report.severity} />
                <Text className="text-gray-500 text-sm">{new Date(report.created_at).toLocaleDateString()}</Text>
            </View>
            {report.image_url && (
                <Image source={{ uri: report.image_url }} className="w-full h-40 rounded-xl mb-3 bg-gray-100" />
            )}
            <Text className="text-gray-800 text-base mb-3">{report.description || 'Pothole reported at this location.'}</Text>
            <View className="flex-row items-center border-t border-gray-100 pt-3">
                <UpvoteButton initialVotes={report.upvotes} reportId={report.id} />
            </View>
        </View>
    );
}
