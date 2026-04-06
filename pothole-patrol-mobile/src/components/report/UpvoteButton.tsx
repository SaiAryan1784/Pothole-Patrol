import { TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import axiosClient from '../../api/axiosClient';

export default function UpvoteButton({ initialVotes, reportId }: { initialVotes: number; reportId: string }) {
    const [upvotes, setUpvotes] = useState(initialVotes);
    const [upvoted, setUpvoted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleUpvote = async () => {
        if (isLoading) return;

        // Optimistic update
        const wasUpvoted = upvoted;
        setUpvoted(!wasUpvoted);
        setUpvotes(v => wasUpvoted ? v - 1 : v + 1);
        setIsLoading(true);

        try {
            const response = await axiosClient.post(`/reports/${reportId}/upvote/`);
            // Sync with server count
            setUpvotes(response.data.upvotes);
            setUpvoted(true);
        } catch (error: any) {
            // Revert optimistic update on failure
            setUpvoted(wasUpvoted);
            setUpvotes(v => wasUpvoted ? v + 1 : v - 1);

            const message = error?.response?.data?.detail || 'Failed to upvote';
            if (error?.response?.status !== 400) {
                Alert.alert('Error', message);
            } else {
                Alert.alert('Cannot upvote', message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <TouchableOpacity
            className={`flex-row items-center px-4 py-2 rounded-full border ${upvoted ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
            onPress={handleUpvote}
            disabled={isLoading}
        >
            {isLoading ? (
                <ActivityIndicator size="small" color={upvoted ? '#2563EB' : '#9CA3AF'} />
            ) : (
                <Text className={upvoted ? 'text-blue-600 font-bold' : 'text-gray-600 font-medium'}>
                    ↑ {upvotes} Upvotes
                </Text>
            )}
        </TouchableOpacity>
    );
}
