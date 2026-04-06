import { Tabs } from 'expo-router';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2563EB' }}>
            <Tabs.Screen name="index" options={{ title: 'Map' }} />
            <Tabs.Screen name="report" options={{ title: 'Report' }} />
            <Tabs.Screen name="leaderboard" options={{ title: 'Leaderboard' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        </Tabs>
    );
}
