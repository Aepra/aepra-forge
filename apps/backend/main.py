import hmac
import json
import os
import threading
import time
from collections import defaultdict, deque

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.schemas.blueprint import ProjectBlueprint
from app.services.generator.fastapi_project_builder import build_fastapi_project_zip

app = FastAPI(
    title="Aepra-Forge API",
    description="The Professional Backend Generator",
    version="1.0.0"
)

RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("AEPRA_BUILD_RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("AEPRA_BUILD_RATE_LIMIT_MAX_REQUESTS", "12"))
MAX_BLUEPRINT_BYTES = int(os.getenv("AEPRA_BUILD_MAX_BLUEPRINT_BYTES", "500000"))
BUILD_API_TOKEN = os.getenv("AEPRA_BUILD_API_TOKEN", "").strip()
DEV_ORIGINS = ["http://localhost:3000", "http://localhost:3001"]
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("AEPRA_ALLOWED_ORIGINS", ",".join(DEV_ORIGINS)).split(",")
    if origin.strip()
]
ALLOWED_ORIGINS = {
    origin.strip()
    for origin in CORS_ALLOWED_ORIGINS
    if origin.strip()
}
TRUSTED_HOSTS = [
    host.strip()
    for host in os.getenv("AEPRA_TRUSTED_HOSTS", "localhost,127.0.0.1").split(",")
    if host.strip()
]


class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._lock = threading.Lock()
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds

        with self._lock:
            bucket = self._buckets[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= self.max_requests:
                return False

            bucket.append(now)
            return True


build_rate_limiter = SlidingWindowRateLimiter(
    max_requests=RATE_LIMIT_MAX_REQUESTS,
    window_seconds=RATE_LIMIT_WINDOW_SECONDS,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=TRUSTED_HOSTS)


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",", maxsplit=1)[0].strip()

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def enforce_build_security(
    request: Request,
    x_aepra_build_token: str | None = Header(default=None),
) -> None:
    origin = request.headers.get("origin")
    if ALLOWED_ORIGINS and origin and origin not in ALLOWED_ORIGINS:
        raise HTTPException(status_code=403, detail="Origin is not allowed")

    if BUILD_API_TOKEN:
        if not x_aepra_build_token:
            raise HTTPException(status_code=401, detail="Missing build token")
        if not hmac.compare_digest(BUILD_API_TOKEN, x_aepra_build_token):
            raise HTTPException(status_code=401, detail="Invalid build token")

    if not build_rate_limiter.allow(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many build requests")

@app.get("/")
async def root():
    return {"status": "success", "message": "Aepra-Forge Backend is Online!"}

@app.post("/api/v1/generator/build")
async def build_infrastructure(
    blueprint: ProjectBlueprint,
    framework: str = Query(default="fastapi", description="Target framework (currently: fastapi)"),
    _security: None = Depends(enforce_build_security),
):
    if framework.lower() != "fastapi":
        raise HTTPException(status_code=400, detail="Framework is not supported yet. Use framework=fastapi")

    blueprint_size = len(json.dumps(blueprint.model_dump(mode="json")).encode("utf-8"))
    if blueprint_size > MAX_BLUEPRINT_BYTES:
        raise HTTPException(status_code=413, detail="Blueprint payload is too large")

    zip_buffer = build_fastapi_project_zip(blueprint)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=aepra-fastapi-project.zip"},
    )