import { useState, useCallback } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';

interface MLResult {
  confidence: number;
  boundingBox: null;
}

const MODEL_SIZE = 320;

// YOLOv8 TFLite output: flat array representing [1, 5, 8400] (x, y, w, h, conf per anchor)
// We extract the maximum objectness score across all 8400 anchors.
function extractConfidence(output: Float32Array): number {
  // Stride of 5 values per anchor: [x, y, w, h, objectness]
  let maxConf = 0;
  for (let i = 4; i < output.length; i += 5) {
    if (output[i] > maxConf) maxConf = output[i];
  }
  // Clamp to [0, 1] — TFLite sigmoid outputs can marginally exceed 1.0 due to fp precision
  return Math.min(1.0, Math.max(0.0, maxConf));
}

// Attempt to load react-native-fast-tflite — may be absent in Expo Go / web.
let useTensorflowModel: ((source: number) => { state: string; model: { runSync: (inputs: Float32Array[]) => Float32Array[] } | null }) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useTensorflowModel = require('react-native-fast-tflite').useTensorflowModel;
} catch {
  // react-native-fast-tflite not available (Expo Go, web, or model not bundled)
}

// Attempt to resolve the model asset — will throw if file doesn't exist yet.
let modelAsset: number | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  modelAsset = require('../../assets/ml/pothole_model.tflite');
} catch {
  // Model file not bundled yet — graceful fallback returns confidence: 0
}

function useModelLoader() {
  if (useTensorflowModel && modelAsset !== null) {
    return useTensorflowModel(modelAsset);
  }
  return { state: 'error', model: null };
}

export const useMLDetection = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const modelLoader = useModelLoader();

  const runInference = useCallback(async (imageUri: string): Promise<MLResult> => {
    // Graceful fallback: model not bundled or not yet loaded
    if (modelLoader.state !== 'loaded' || !modelLoader.model) {
      return { confidence: 0, boundingBox: null };
    }

    setIsProcessing(true);
    try {
      // Resize to model input dimensions
      const resized = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: MODEL_SIZE, height: MODEL_SIZE } }],
        { format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );

      // Decode base64 JPEG bytes → Float32Array normalized to [0, 1]
      const b64 = resized.base64!;
      const binary = atob(b64);
      const inputData = new Float32Array(MODEL_SIZE * MODEL_SIZE * 3);
      const len = Math.min(binary.length, inputData.length);
      for (let i = 0; i < len; i++) {
        inputData[i] = binary.charCodeAt(i) / 255.0;
      }

      const outputs = modelLoader.model.runSync([inputData]);
      const confidence = extractConfidence(outputs[0] as unknown as Float32Array);
      return { confidence: parseFloat(confidence.toFixed(2)), boundingBox: null };
    } catch {
      return { confidence: 0, boundingBox: null };
    } finally {
      setIsProcessing(false);
    }
  }, [modelLoader]);

  const modelLoaded = modelLoader.state === 'loaded' && modelLoader.model !== null;

  return { runInference, isProcessing, modelLoaded };
};
