from fastapi import APIRouter

from .router import router as backand_router

router = APIRouter()

router.include_router(backand_router, prefix="", tags=["backand"]) 

__all__ = ["router"]
