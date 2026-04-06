import messaging from '@react-native-firebase/messaging';

export const requestUserPermission = async () => {
    const authStatus = await messaging().requestPermission();
    const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    return enabled;
};

export const getFCMToken = async () => {
    return await messaging().getToken();
};

export const onMessage = (callback: (message: any) => void) => {
    return messaging().onMessage(callback);
};
