import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Resizes image to max 800px width and compresses to 0.7 quality as per CLAUDE.md guidelines
 */
export const compressImage = async (uri: string): Promise<string> => {
    try {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        return result.uri;
    } catch (error) {
        console.error('Image compression failed:', error);
        return uri; // Fallback to original image if manipulation fails
    }
};
