import argparse
import shutil
from pathlib import Path


# Path from ml/src/ → pothole-patrol-mobile/assets/ml/
MOBILE_ASSETS = Path(__file__).resolve().parent.parent.parent / 'pothole-patrol-mobile' / 'assets' / 'ml'


def export(model_path: str, imgsz: int = 320) -> None:
    from ultralytics import YOLO

    model = YOLO(model_path)

    # TFLite INT8 — for React Native on-device inference
    print("Exporting to TFLite INT8...")
    tflite_path = Path(model.export(format='tflite', imgsz=imgsz, int8=True))
    print(f"TFLite exported: {tflite_path}")

    # ONNX — for server-side inference fallback (future)
    print("Exporting to ONNX...")
    onnx_path = Path(model.export(format='onnx', imgsz=imgsz))
    print(f"ONNX exported:   {onnx_path}")

    # Copy TFLite to mobile assets so Expo bundles it
    MOBILE_ASSETS.mkdir(parents=True, exist_ok=True)
    dest = MOBILE_ASSETS / 'pothole_model.tflite'
    shutil.copy2(tflite_path, dest)
    size_kb = dest.stat().st_size // 1024
    print(f"\nCopied to mobile assets: {dest} ({size_kb} KB)")
    print("Next: run `npx expo start --clear` to bundle the new model.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Export trained model to TFLite + ONNX')
    parser.add_argument('--model', default='runs/detect/train/weights/best.pt')
    parser.add_argument('--imgsz', type=int, default=320)
    args = parser.parse_args()
    export(args.model, args.imgsz)
