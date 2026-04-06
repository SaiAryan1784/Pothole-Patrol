import auth from '@react-native-firebase/auth';

export const sendOTP = async (phoneNumber: string) => {
    const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
    return confirmation;
};

export const verifyOTP = async (confirmation: any, code: string) => {
    try {
        await confirmation.confirm(code);
        return true;
    } catch (error) {
        console.error('Invalid OTP', error);
        return false;
    }
};

export const signOut = async () => {
    await auth().signOut();
};

export const getIdToken = async () => {
    const user = auth().currentUser;
    if (user) {
        return await user.getIdToken();
    }
    return null;
};
