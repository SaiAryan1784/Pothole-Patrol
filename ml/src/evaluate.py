import argparse


def evaluate(model_path: str, dataset_yaml: str) -> None:
    from ultralytics import YOLO

    model = YOLO(model_path)
    metrics = model.val(data=dataset_yaml, imgsz=320, split='test')

    print(f"\n── Evaluation Results ──────────────────")
    print(f"  mAP50:      {metrics.box.map50:.3f}")
    print(f"  mAP50-95:   {metrics.box.map:.3f}")
    print(f"  Precision:  {metrics.box.mp:.3f}")
    print(f"  Recall:     {metrics.box.mr:.3f}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Evaluate trained pothole detector')
    parser.add_argument('--model', default='runs/detect/train/weights/best.pt')
    parser.add_argument('--dataset', default='../data/pothole.yaml',
                        help='Path to dataset YAML (should have a test split)')
    args = parser.parse_args()
    evaluate(args.model, args.dataset)
