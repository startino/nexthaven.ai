from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from src.routers import evaluation, query

router = APIRouter()
router.include_router(evaluation.router)
router.include_router(query.router)


@router.get("/")
def redirect_to_docs() -> RedirectResponse:
    return RedirectResponse(url="/docs")
