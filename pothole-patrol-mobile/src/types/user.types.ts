export interface UserProfile {
    firebase_uid: string;
    email: string | null;
    display_name: string | null;
    phone_number: string | null;
    avatar_url: string | null;
    date_joined: string;
}

export interface Badge {
    id: number;
    name: string;
    description: string;
    icon_url: string | null;
    required_points: number;
}

export interface LeaderboardEntry {
    rank: number;
    display_name: string;
    avatar_url: string | null;
    total_points: number;
}
