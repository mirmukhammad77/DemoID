import math
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

SERVICE_ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    host: str = "127.0.0.1"
    port: int = 8000
    model: str = "VGG-Face"
    detector: str = "opencv"
    metric: str = "cosine"
    engine: str = "onnx"
    threshold: float | None = None
    cache_home: Path = SERVICE_ROOT

    def __post_init__(self):
        if self.host not in {"127.0.0.1", "localhost", "::1"} or not 1 <= self.port <= 65535:
            raise ValueError("Invalid DEEPFACE_HOST or DEEPFACE_PORT; use a loopback address and valid port.")
        if (self.model, self.detector, self.metric, self.engine) != ("VGG-Face", "opencv", "cosine", "onnx"):
            raise ValueError("Supported DeepFace settings: VGG-Face / opencv / cosine / onnx.")
        if self.threshold is not None and (not math.isfinite(self.threshold) or not 0 <= self.threshold <= 2):
            raise ValueError("DEEPFACE_DISTANCE_THRESHOLD must be finite and between 0 and 2 for cosine distance.")


def read_settings() -> Settings:
    load_dotenv(SERVICE_ROOT / ".env", override=False)
    if "FACE_SIMILARITY_THRESHOLD" in os.environ:
        raise ValueError("FACE_SIMILARITY_THRESHOLD is retired; remove it. Use DEEPFACE_DISTANCE_THRESHOLD if needed.")
    try:
        port = int(os.environ.get("DEEPFACE_PORT", "8000"))
        raw_threshold = os.environ.get("DEEPFACE_DISTANCE_THRESHOLD", "").strip()
        threshold = float(raw_threshold) if raw_threshold else None
    except ValueError:
        raise ValueError("Invalid DEEPFACE_PORT or DEEPFACE_DISTANCE_THRESHOLD.") from None
    return Settings(
        host=os.environ.get("DEEPFACE_HOST", "127.0.0.1"), port=port,
        model=os.environ.get("DEEPFACE_MODEL", "VGG-Face"),
        detector=os.environ.get("DEEPFACE_DETECTOR_BACKEND", "opencv"),
        metric=os.environ.get("DEEPFACE_DISTANCE_METRIC", "cosine"),
        engine=os.environ.get("DEEPFACE_BACKEND_ENGINE", "onnx"), threshold=threshold,
        cache_home=Path(os.environ.get("DEEPFACE_HOME", str(SERVICE_ROOT))).expanduser().resolve(),
    )
