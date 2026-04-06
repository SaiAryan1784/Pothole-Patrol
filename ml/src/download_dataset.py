"""
Download the Roboflow public pothole detection dataset in YOLOv8 format.

Usage:
    python src/download_dataset.py --api-key YOUR_KEY

Get a free Roboflow API key at: https://roboflow.com
After downloading, pass the generated data.yaml to train.py:
    python src/train.py --dataset ../data/pothole-detection-1/data.yaml

Alternative — manual download (no API key needed):
    1. Download any YOLO-format pothole dataset from Kaggle or Roboflow Universe
    2. Extract to ml/data/
    3. Point --dataset at the data.yaml file
"""
import argparse


def download(api_key: str, output_dir: str = '../data') -> None:
    from roboflow import Roboflow

    rf = Roboflow(api_key=api_key)
    project = rf.workspace('roboflow-gw7yv').project('pothole-detection-9dpga')
    dataset = project.version(1).download('yolov8', location=output_dir)

    print(f"\nDataset downloaded to: {dataset.location}")
    print(f"YAML config:           {dataset.location}/data.yaml")
    print(f"\nRun training with:")
    print(f"  python src/train.py --dataset {dataset.location}/data.yaml")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Download pothole dataset from Roboflow')
    parser.add_argument('--api-key', required=True,
                        help='Roboflow API key (free at roboflow.com)')
    parser.add_argument('--output', default='../data',
                        help='Directory to download dataset into')
    args = parser.parse_args()
    download(args.api_key, args.output)
