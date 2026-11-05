from fastapi import APIRouter, Request

from app.dtos.image_dto import ComparisonDto, ImageDto
from app.errors import WorkerUnavailable

router = APIRouter()


@router.get("/health/ready")
async def ready(request: Request):
    service = request.app.state.inference
    if not service.ready:
        raise WorkerUnavailable()
    return {"status": "ready", "model": service.settings.model,
            "detector": service.settings.detector, "metric": service.settings.metric}


@router.post("/detect")
async def detect(data: ImageDto, request: Request):
    return await request.app.state.inference.detect(data.imageBase64)


@router.post("/compare")
async def compare(data: ComparisonDto, request: Request):
    return await request.app.state.inference.compare(data.referenceBase64, data.candidateBase64)
