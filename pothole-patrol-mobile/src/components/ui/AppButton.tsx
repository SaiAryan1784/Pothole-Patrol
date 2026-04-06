import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface Props {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    loading?: boolean;
}

export default function AppButton({ title, onPress, variant = 'primary', loading }: Props) {
    const bgColors = {
        primary: 'bg-blue-600',
        secondary: 'bg-gray-200',
        ghost: 'bg-transparent',
    };
    const textColors = {
        primary: 'text-white',
        secondary: 'text-gray-900',
        ghost: 'text-blue-600',
    };

    return (
        <TouchableOpacity
            className={`w-full p-4 rounded-xl items-center justify-center ${bgColors[variant]}`}
            onPress={onPress}
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? 'white' : 'black'} />
            ) : (
                <Text className={`text-lg font-semibold ${textColors[variant]}`}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}
