import os, time, logging, logfire
from dotenv import load_dotenv

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from src.utils.logging import setup_logging
from src.routers import router

load_dotenv()
setup_logging()


def create_app() -> FastAPI:
    app = FastAPI()

    logfire.configure(environment=os.getenv("LOGFIRE_ENV", "local"),token=os.getenv("LOGFIRE_TOKEN"), scrubbing=False)
    logfire.instrument_fastapi(app, capture_headers=True)
    logfire.instrument_openai()

    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response

    app.include_router(router)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return app


app = create_app()
