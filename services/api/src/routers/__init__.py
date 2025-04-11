from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from src.routers import property_evaluation, query_property

router = APIRouter()
router.include_router(property_evaluation.router)
router.include_router(query_property.router)

@router.get("/")
def redirect_to_docs() -> RedirectResponse:
    return RedirectResponse(url="/docs")