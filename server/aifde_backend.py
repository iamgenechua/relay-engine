from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from pathlib import Path

import httpx
from fastapi import Request


def _header(request: Request, names: list[str], fallback: str) -> str:
    for name in names:
        value = request.headers.get(name)
        if value:
            return value
    return fallback


async def _ship(payload: dict, relay_api_base: str) -> None:
    if not relay_api_base:
        return

    endpoint = relay_api_base.rstrip("/") + "/ingest"

    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            await client.post(endpoint, json=payload)
    except Exception:
        # Never block request handling on telemetry delivery.
        return


def install_aifde_backend(app, *, project_name: str = "relay-engine", relay_api_base: str = "https://relay-engine-production.up.railway.app"):
    stream_path = Path(os.environ.get("AIFDE_STREAM_PATH", "data/aifde-backend-stream.ndjson"))
    stream_path.parent.mkdir(parents=True, exist_ok=True)

    @app.middleware("http")
    async def aifde_middleware(request: Request, call_next):
        started = time.time()
        session_id = _header(request, ["x-session-id", "x-relay-session-id", "x-aifde-session-id"], fallback=str(uuid.uuid4()))
        user_id = _header(request, ["x-user-id", "x-relay-user-id", "x-aifde-user-id"], fallback="anonymous")

        payload_base = {
            "source": "backend",
            "project": project_name,
            "sessionId": session_id,
            "userId": user_id,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "method": request.method,
            "path": request.url.path,
        }

        try:
            response = await call_next(request)
            duration_ms = int((time.time() - started) * 1000)

            payload = {
                **payload_base,
                "event": "backend_request",
                "status": response.status_code,
                "durationMs": duration_ms,
            }

            with stream_path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(payload) + "\n")

            asyncio.create_task(_ship(payload, relay_api_base))
            response.headers.setdefault("x-aifde-session-id", session_id)
            return response
        except Exception as exc:
            duration_ms = int((time.time() - started) * 1000)
            payload = {
                **payload_base,
                "event": "backend_exception",
                "status": 500,
                "durationMs": duration_ms,
                "error": str(exc),
            }
            with stream_path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(payload) + "\n")
            asyncio.create_task(_ship(payload, relay_api_base))
            raise
