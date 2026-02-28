import logging

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from agent.loop import run_fde_stream
from agent.models import FDERequest
from agent.store import get_reports

logger = logging.getLogger("relay")

router = APIRouter(prefix="/api/fde")


@router.post("/stream")
async def fde_stream(request: Request, req: FDERequest):
    logger.info(
        "[stream] POST /api/fde/stream — %d message(s), sessionId=%s, elementContext=%s, recentEvents=%d, pageSnapshot=%d chars",
        len(req.messages),
        req.sessionId,
        bool(req.elementContext),
        len(req.recentEvents),
        len(req.pageSnapshot),
    )
    return StreamingResponse(
        run_fde_stream(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "x-vercel-ai-ui-message-stream": "v1",
        },
    )


@router.get("/reports")
async def list_reports():
    logger.info("[reports] GET /api/fde/reports")
    return get_reports()
