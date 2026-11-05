import asyncio
import threading

from app.clients.deepface_client import DeepFaceClient
from app.errors import InvalidImage, WorkerUnavailable
from app.settings import Settings
from app.utils.image_util import decode_image


class InferenceService:
    def __init__(self, settings: Settings, client: DeepFaceClient | None = None):
        self.settings = settings
        self.client = client or DeepFaceClient(settings)
        self.ready = False
        self._slot = threading.Lock()

    async def initialize(self):
        await asyncio.to_thread(self.client.initialize)
        self.ready = True

    async def _run(self, operation, *args):
        if not self.ready or not self._slot.acquire(blocking=False):
            raise WorkerUnavailable()

        def execute():
            try:
                return operation(*args)
            except (InvalidImage, WorkerUnavailable):
                raise
            except Exception:
                raise WorkerUnavailable() from None
            finally:
                self._slot.release()

        try:
            future = asyncio.get_running_loop().run_in_executor(None, execute)
        except BaseException:
            self._slot.release()
            raise
        # A disconnected/timed-out caller must not release capacity while native inference still runs.
        try:
            return await asyncio.shield(future)
        except asyncio.CancelledError:
            future.add_done_callback(lambda done: done.exception() if not done.cancelled() else None)
            raise

    async def detect(self, encoded: str) -> dict:
        return await self._run(lambda: {"faceCount": self.client.count(decode_image(encoded))})

    async def compare(self, reference_encoded: str, candidate_encoded: str) -> dict:
        def operation():
            reference = decode_image(reference_encoded)
            candidate = decode_image(candidate_encoded)
            counts = {"referenceFaceCount": self.client.count(reference),
                      "candidateFaceCount": self.client.count(candidate)}
            if counts["referenceFaceCount"] != 1 or counts["candidateFaceCount"] != 1:
                return {"status": "invalid_faces", **counts}
            return {"status": "compared", **counts, **self.client.compare(reference, candidate),
                    "model": self.settings.model, "detector": self.settings.detector,
                    "metric": self.settings.metric}
        return await self._run(operation)
