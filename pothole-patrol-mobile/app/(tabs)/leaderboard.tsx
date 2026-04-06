import { View, Text, FlatList, Image, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../src/api/axiosClient';
import { useUserStore } from '../../src/store/userStore';
import { LeaderboardEntry } from '../../src/types/user.types';

function RankMedal({ rank }: { rank: number }) {
    if (rank === 1) return <Text className="text-2xl">🥇</Text>;
    if (rank === 2) return <Text className="text-2xl">🥈</Text>;
    if (rank === 3) return <Text className="text-2xl">🥉</Text>;
    return (
        <View className="w-8 h-8 items-center justify-center">
            <Text className="text-gray-500 font-bold text-sm">#{rank}</Text>
        </View>
    );
}

function AvatarPlaceholder({ name }: { name: string }) {
    const initial = (name ?? '?')[0].toUpperCase();
    return (
        <View className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center mr-3">
            <Text className="text-white font-bold text-base">{initial}</Text>
        </View>
    );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
    return (
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
            <View className="w-10 items-center mr-3">
                <RankMedal rank={entry.rank} />
            </View>
            {entry.avatar_url ? (
                <Image
                    source={{ uri: entry.avatar_url }}
                    className="w-10 h-10 rounded-full mr-3 bg-gray-200"
                />
            ) : (
                <AvatarPlaceholder name={entry.display_name ?? '?'} />
            )}
            <Text className="flex-1 font-medium text-gray-800" numberOfLines={1}>
                {entry.display_name ?? 'Anonymous'}
            </Text>
            <Text className="font-bold text-blue-600">{entry.total_points} pts</Text>
        </View>
    );
}

export default function LeaderboardScreen() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const { points, fetchScore } = useUserStore();

    const fetchLeaderboard = useCallback(async () => {
        try {
            const response = await axiosClient.get('/gamification/leaderboard/');
            setEntries(response.data);
        } catch (error) {
            console.error('Failed to fetch leaderboard', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaderboard();
        fetchScore();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchLeaderboard();
    };

    const ListHeader = () => (
        <View className="px-4 pt-14 pb-4 bg-white border-b border-gray-100">
            <Text className="text-2xl font-bold text-gray-900 mb-1">Leaderboard</Text>
            <Text className="text-gray-500 text-sm">Your points: <Text className="font-bold text-blue-600">{points}</Text></Text>
        </View>
    );

    if (isLoading) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <FlatList
                data={entries}
                keyExtractor={(item) => String(item.rank)}
                renderItem={({ item }) => <LeaderboardRow entry={item} />}
                ListHeaderComponent={ListHeader}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={
                    <View className="items-center justify-center py-16">
                        <Text className="text-gray-400 text-base">No data yet. Submit some reports!</Text>
                    </View>
                }
            />
        </View>
    );
}
