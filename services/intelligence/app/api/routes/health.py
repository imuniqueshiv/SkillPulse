from fastapi import APIRouter, Depends

from app.api.dependencies import get_settings
from app.core.config import Settings

router = APIRouter()


@router.get("/health")
def health(config: Settings = Depends(get_settings)) -> dict[str, str]:
    return {
        "status": "ok",
        "service": config.service_name,
    }
