import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';

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

export type NormalizedRect = {
    // All four values are fractions of the image's dimensions in [0, 1].
    x: number;
    y: number;
    width: number;
    height: number;
};

export const getImageSize = (uri: string): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
        Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
    });

/**
 * Crops an image using a normalized rect (fractions of the image's dimensions),
 * then resizes the result to a square with sides `outputSize` px. Output is JPEG.
 *
 * Used to tighten a photo around the pothole before ML inference, so a small
 * pothole in the original frame fills more of YOLOv8's 320x320 input.
 */
export const cropAndResize = async (
    uri: string,
    rect: NormalizedRect,
    outputSize = 640,
): Promise<string> => {
    const { width: imgW, height: imgH } = await getImageSize(uri);
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

    const cropX = clamp01(rect.x) * imgW;
    const cropY = clamp01(rect.y) * imgH;
    const cropW = clamp01(rect.width) * imgW;
    const cropH = clamp01(rect.height) * imgH;

    const result = await ImageManipulator.manipulateAsync(
        uri,
        [
            { crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } },
            { resize: { width: outputSize, height: outputSize } },
        ],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
};
