from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from agent.loop import run_fde_stream
from agent.models import FDERequest
from agent.store import get_reports

router = APIRouter(prefix="/api/fde")


@router.post("/stream")
async def fde_stream(req: FDERequest):
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
    return get_reports()
