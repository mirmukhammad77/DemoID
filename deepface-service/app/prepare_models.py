import sys

from app.clients.deepface_client import DeepFaceClient
from app.settings import read_settings


def main():
    try:
        client = DeepFaceClient(read_settings())
        print("Preparing VGG-Face and OpenCV for CPU inference...", flush=True)
        client.initialize()
        print(f"Models ready. Effective cosine distance threshold: {client.threshold}", flush=True)
        return 0
    except Exception:
        print("Model preparation failed. Check network access, cache permissions, and the pinned Python environment.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
