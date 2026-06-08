from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, courses
from app.core.config import settings

app = FastAPI(title="Python Course Portal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.backend_cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(courses.router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

