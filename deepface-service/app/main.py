import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.responses import JSONResponse

from app.controllers.biometrics_controller import router
from app.errors import InvalidImage, WorkerUnavailable
from app.services.inference_service import InferenceService
from app.settings import read_settings
from app.utils.http_util import InternalHttpMiddleware


def create_app(service: InferenceService | None = None):
    inference = service or InferenceService(read_settings())

    @asynccontextmanager
    async def lifespan(application):
        try:
            await inference.initialize()
        except Exception:
            print("DeepFace initialization failed. Check the pinned environment and run python -m app.prepare_models.", file=sys.stderr)
            raise RuntimeError("Biometric service initialization failed.") from None
        yield
        inference.ready = False

    api = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    api.state.inference = inference
    api.include_router(router)

    @api.exception_handler(RequestValidationError)
    async def validation_error(_request, _error):
        return JSONResponse({"code": "INVALID_REQUEST", "message": "The image request is invalid."}, status_code=400)

    @api.exception_handler(InvalidImage)
    async def invalid_image(_request, _error):
        return JSONResponse({"code": "INVALID_IMAGE", "message": "A valid bounded JPEG or PNG image is required."}, status_code=400)

    @api.exception_handler(WorkerUnavailable)
    async def unavailable(_request, _error):
        return JSONResponse({"code": "SERVICE_UNAVAILABLE", "message": "Biometric processing is temporarily unavailable."}, status_code=503)

    return InternalHttpMiddleware(api)


app = create_app()
