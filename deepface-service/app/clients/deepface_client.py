import math
import os

from app.errors import WorkerUnavailable
from app.settings import Settings


class DeepFaceClient:
    """Library adapter: return observations; the NestJS service owns application outcomes."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.threshold = settings.threshold
        self._library = None
        self._no_face = None

    def initialize(self):
        os.environ["DEEPFACE_HOME"] = str(self.settings.cache_home)
        os.environ["DEEPFACE_BACKEND_ENGINE"] = self.settings.engine
        os.environ["DEEPFACE_LOG_LEVEL"] = "40"
        from deepface import DeepFace
        from deepface.modules.exceptions import FaceNotDetected
        from deepface.modules.verification import find_threshold

        DeepFace.build_model(model_name=self.settings.model, task="facial_recognition")
        DeepFace.build_model(model_name=self.settings.detector, task="face_detector")
        self.threshold = self.settings.threshold if self.settings.threshold is not None else float(
            find_threshold(self.settings.model, self.settings.metric)
        )
        if not math.isfinite(self.threshold) or not 0 <= self.threshold <= 2:
            raise WorkerUnavailable()
        self._library = DeepFace
        self._no_face = FaceNotDetected

    def count(self, image) -> int:
        if self._library is None:
            raise WorkerUnavailable()
        try:
            faces = self._library.extract_faces(
                img_path=image, detector_backend=self.settings.detector,
                enforce_detection=True, align=True, anti_spoofing=False,
            )
            return len(faces)
        except self._no_face:
            return 0
        except Exception:
            raise WorkerUnavailable() from None

    def compare(self, reference, candidate) -> dict:
        if self._library is None:
            raise WorkerUnavailable()
        try:
            result = self._library.verify(
                img1_path=reference, img2_path=candidate, model_name=self.settings.model,
                detector_backend=self.settings.detector, distance_metric=self.settings.metric,
                threshold=self.threshold, enforce_detection=True, align=True, silent=True,
                anti_spoofing=False,
            )
            distance = float(result["distance"])
            threshold = float(result["threshold"])
            verified = result["verified"]
            if (not math.isfinite(distance) or not 0 <= distance <= 2
                    or threshold != self.threshold or type(verified) is not bool
                    or verified != (distance <= threshold)):
                raise WorkerUnavailable()
            return {"distance": distance, "threshold": threshold, "verified": verified}
        except Exception:
            raise WorkerUnavailable() from None
