import storage from '@react-native-firebase/storage';

export const uploadImageToFirebase = async (imageUri: string, path: string): Promise<string> => {
    const reference = storage().ref(path);
    await reference.putFile(imageUri);
    return await reference.getDownloadURL();
};
