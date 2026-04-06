import {
    View, Text, TouchableOpacity, Image, TextInput,
    ScrollView, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import axiosClient from '../../src/api/axiosClient';
import { Badge } from '../../src/types/user.types';

function BadgeItem({ badge }: { badge: Badge }) {
    return (
        <View className="items-center w-1/3 p-2">
            {badge.icon_url ? (
                <Image source={{ uri: badge.icon_url }} className="w-14 h-14 rounded-full bg-gray-100 mb-1" />
            ) : (
                <View className="w-14 h-14 rounded-full bg-blue-100 items-center justify-center mb-1">
                    <Text className="text-2xl">🏅</Text>
                </View>
            )}
            <Text className="text-xs text-center text-gray-700 font-medium" numberOfLines={2}>{badge.name}</Text>
        </View>
    );
}

function SkeletonBlock({ className }: { className: string }) {
    return <View className={`bg-gray-200 rounded-lg animate-pulse ${className}`} />;
}

export default function ProfileScreen() {
    const logout = useAuthStore((state) => state.logout);
    const { profile, badges, points, isLoading, fetchProfile, fetchScore } = useUserStore();
    const [editName, setEditName] = useState('');
    const [savingName, setSavingName] = useState(false);

    useEffect(() => {
        fetchProfile();
        fetchScore();
    }, []);

    useEffect(() => {
        if (profile?.display_name) {
            setEditName(profile.display_name);
        }
    }, [profile]);

    const handleNameBlur = async () => {
        const trimmed = editName.trim();
        if (!trimmed || trimmed === profile?.display_name) return;
        setSavingName(true);
        try {
            await axiosClient.patch('/accounts/me/', { display_name: trimmed });
            await fetchProfile();
        } catch {
            Alert.alert('Error', 'Failed to update display name');
            setEditName(profile?.display_name ?? '');
        } finally {
            setSavingName(false);
        }
    };

    if (isLoading && !profile) {
        return (
            <ScrollView className="flex-1 bg-white px-5 pt-14">
                <SkeletonBlock className="w-20 h-20 rounded-full self-center mb-4" />
                <SkeletonBlock className="h-6 w-40 self-center mb-2" />
                <SkeletonBlock className="h-4 w-24 self-center mb-8" />
                <SkeletonBlock className="h-12 w-full mb-3" />
                <SkeletonBlock className="h-12 w-full mb-3" />
            </ScrollView>
        );
    }

    const avatarUrl = profile?.avatar_url;
    const displayName = profile?.display_name ?? 'Anonymous';
    const initial = displayName[0].toUpperCase();

    return (
        <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Header */}
            <View className="items-center pt-14 pb-6 border-b border-gray-100">
                {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} className="w-20 h-20 rounded-full bg-gray-200 mb-3" />
                ) : (
                    <View className="w-20 h-20 rounded-full bg-blue-500 items-center justify-center mb-3">
                        <Text className="text-white text-3xl font-bold">{initial}</Text>
                    </View>
                )}

                <View className="flex-row items-center">
                    <TextInput
                        className="text-xl font-bold text-gray-900 text-center border-b border-transparent focus:border-blue-400 px-2 py-1"
                        value={editName}
                        onChangeText={setEditName}
                        onBlur={handleNameBlur}
                        placeholder="Your name"
                        returnKeyType="done"
                    />
                    {savingName && <ActivityIndicator size="small" color="#2563EB" style={{ marginLeft: 6 }} />}
                </View>

                {profile?.phone_number ? (
                    <Text className="text-gray-400 text-sm mt-1">{profile.phone_number}</Text>
                ) : null}
            </View>

            {/* Points */}
            <View className="flex-row items-center justify-center py-5 border-b border-gray-100">
                <Text className="text-4xl mr-2">🏆</Text>
                <View>
                    <Text className="text-3xl font-bold text-blue-600">{points}</Text>
                    <Text className="text-gray-400 text-xs">Total Points</Text>
                </View>
            </View>

            {/* Badges */}
            <View className="px-4 pt-5">
                <Text className="text-lg font-bold text-gray-800 mb-3">Badges ({badges.length})</Text>
                {badges.length === 0 ? (
                    <Text className="text-gray-400 text-sm">Submit verified reports to earn badges!</Text>
                ) : (
                    <FlatList
                        data={badges}
                        keyExtractor={(b) => String(b.id)}
                        numColumns={3}
                        scrollEnabled={false}
                        renderItem={({ item }) => <BadgeItem badge={item} />}
                    />
                )}
            </View>

            {/* Sign out */}
            <View className="px-4 mt-8">
                <TouchableOpacity
                    className="w-full bg-red-100 p-4 rounded-xl items-center"
                    onPress={logout}
                >
                    <Text className="text-red-600 font-semibold">Sign Out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
