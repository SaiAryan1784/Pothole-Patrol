/**
 * CropOverlay — draggable + pinchable square crop rectangle on top of an image.
 *
 * Props:
 *   width, height       — pixel size of the area to overlay (should match the image render size).
 *   onCropChange(rect)  — called on gesture end with the crop rect normalized to [0, 1]
 *                         relative to the overlay's width/height (x, y, width, height).
 *
 * The crop rect is constrained to a square (matches YOLOv8 input aspect), stays
 * inside the overlay bounds, and has a minimum size of 20% of the overlay.
 */
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle, useSharedValue, runOnJS,
} from 'react-native-reanimated';
import { useCallback } from 'react';

type Rect = { x: number; y: number; width: number; height: number };

type Props = {
    width: number;
    height: number;
    onCropChange?: (rect: Rect) => void;
};

const MIN_SIZE_FRAC = 0.2;   // minimum crop = 20% of the shorter overlay side
const INITIAL_SIZE_FRAC = 0.7; // default = 70%

export default function CropOverlay({ width, height, onCropChange }: Props) {
    // Square crop side, in display px.
    const minSide = Math.min(width, height);
    const minSize = minSide * MIN_SIZE_FRAC;
    const maxSize = minSide;

    const size = useSharedValue(minSide * INITIAL_SIZE_FRAC);
    const cx = useSharedValue(width / 2);
    const cy = useSharedValue(height / 2);

    // Each gesture stores the starting value so incremental deltas work correctly.
    const startCx = useSharedValue(0);
    const startCy = useSharedValue(0);
    const startSize = useSharedValue(0);

    const emitChange = useCallback((x: number, y: number, s: number) => {
        onCropChange?.({
            x: x / width,
            y: y / height,
            width: s / width,
            height: s / height,
        });
    }, [width, height, onCropChange]);

    const panGesture = Gesture.Pan()
        .onStart(() => {
            startCx.value = cx.value;
            startCy.value = cy.value;
        })
        .onUpdate((e) => {
            const half = size.value / 2;
            const newCx = Math.min(width - half, Math.max(half, startCx.value + e.translationX));
            const newCy = Math.min(height - half, Math.max(half, startCy.value + e.translationY));
            cx.value = newCx;
            cy.value = newCy;
        })
        .onEnd(() => {
            const s = size.value;
            const x = cx.value - s / 2;
            const y = cy.value - s / 2;
            runOnJS(emitChange)(x, y, s);
        });

    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            startSize.value = size.value;
        })
        .onUpdate((e) => {
            let newSize = startSize.value * e.scale;
            newSize = Math.min(maxSize, Math.max(minSize, newSize));
            // Re-clamp center so the rect stays inside the overlay.
            const half = newSize / 2;
            size.value = newSize;
            cx.value = Math.min(width - half, Math.max(half, cx.value));
            cy.value = Math.min(height - half, Math.max(half, cy.value));
        })
        .onEnd(() => {
            const s = size.value;
            const x = cx.value - s / 2;
            const y = cy.value - s / 2;
            runOnJS(emitChange)(x, y, s);
        });

    const composed = Gesture.Simultaneous(panGesture, pinchGesture);

    const rectStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        left: cx.value - size.value / 2,
        top: cy.value - size.value / 2,
        width: size.value,
        height: size.value,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.95)',
    }));

    // Four darkening rectangles around the crop. Each is driven by an
    // animated style derived from the shared values.
    const topMask = useAnimatedStyle(() => ({
        position: 'absolute',
        left: 0, top: 0, right: 0,
        height: cy.value - size.value / 2,
        backgroundColor: 'rgba(0,0,0,0.55)',
    }));
    const bottomMask = useAnimatedStyle(() => ({
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        top: cy.value + size.value / 2,
        backgroundColor: 'rgba(0,0,0,0.55)',
    }));
    const leftMask = useAnimatedStyle(() => ({
        position: 'absolute',
        left: 0,
        top: cy.value - size.value / 2,
        width: cx.value - size.value / 2,
        height: size.value,
        backgroundColor: 'rgba(0,0,0,0.55)',
    }));
    const rightMask = useAnimatedStyle(() => ({
        position: 'absolute',
        top: cy.value - size.value / 2,
        left: cx.value + size.value / 2,
        right: 0,
        height: size.value,
        backgroundColor: 'rgba(0,0,0,0.55)',
    }));

    return (
        <GestureDetector gesture={composed}>
            <View
                style={{
                    position: 'absolute', left: 0, top: 0,
                    width, height,
                }}
                collapsable={false}
            >
                <Animated.View style={topMask} />
                <Animated.View style={bottomMask} />
                <Animated.View style={leftMask} />
                <Animated.View style={rightMask} />
                <Animated.View style={rectStyle} />
            </View>
        </GestureDetector>
    );
}
