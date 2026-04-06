import argparse
from pathlib import Path


def _has_mps() -> bool:
    try:
        import torch
        return torch.backends.mps.is_available()
    except Exception:
        return False


def _has_cuda() -> bool:
    try:
        import torch
        return torch.cuda.is_available()
    except Exception:
        return False


MODEL = 'yolov8n.pt'   # nano — smallest, fastest for mobile
IMG_SIZE = 320          # 320×320 keeps TFLite model < 5 MB
BATCH = 16


def train(epochs: int, dataset_yaml: str, project: str = 'runs/detect') -> Path:
    from ultralytics import YOLO

    device = 'mps' if _has_mps() else ('cuda' if _has_cuda() else 'cpu')
    print(f"Training on device: {device}")

    model = YOLO(MODEL)
    results = model.train(
        data=dataset_yaml,
        epochs=epochs,
        imgsz=IMG_SIZE,
        batch=BATCH,
        device=device,
        project=project,
        name='train',
        exist_ok=True,
        patience=20,
        val=True,
    )

    best = Path(project) / 'train' / 'weights' / 'best.pt'
    map50 = results.results_dict.get('metrics/mAP50(B)', 'N/A')
    if isinstance(map50, float):
        print(f"\nTraining complete. Best model: {best}")
        print(f"mAP50: {map50:.3f}")
    else:
        print(f"\nTraining complete. Best model: {best}")
    return best


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train YOLOv8-nano pothole detector')
    parser.add_argument('--epochs', type=int, default=50)
    parser.add_argument('--dataset', type=str, default='../data/pothole.yaml',
                        help='Path to dataset YAML (e.g. ../data/pothole-detection-1/data.yaml)')
    args = parser.parse_args()
    train(args.epochs, args.dataset)
