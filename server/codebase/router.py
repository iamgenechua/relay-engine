from pathlib import Path

from fastapi import APIRouter, HTTPException

from codebase.models import CodeUploadRequest

router = APIRouter(prefix="/api/codebase")

DATA_DIR = Path("data").resolve()


def _safe_resolve(base: Path, relative: str) -> Path:
    """Resolve a relative path under base, rejecting path traversal."""
    dest = (base / relative).resolve()
    if not str(dest).startswith(str(base.resolve())):
        raise HTTPException(status_code=400, detail=f"Invalid path: {relative}")
    return dest


@router.post("/upload")
async def upload_codebase(req: CodeUploadRequest):
    if not req.files:
        raise HTTPException(status_code=400, detail="No files provided")

    project_dir = DATA_DIR / req.project
    backend_dir = project_dir / req.backend_dir
    frontend_dir = project_dir / req.frontend_dir

    written = []

    for f in req.files:
        is_backend = f.path.startswith(req.backend_prefix)

        if is_backend:
            rel_path = f.path[len(req.backend_prefix):]
            dest = _safe_resolve(backend_dir, rel_path)
        else:
            dest = _safe_resolve(frontend_dir, f.path)

        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(f.content, encoding="utf-8")
        written.append(str(dest.relative_to(project_dir)))

    return {
        "status": "ok",
        "project": req.project,
        "files_written": len(written),
        "output_dir": str(project_dir),
        "paths": written,
    }


@router.get("/tree")
async def codebase_tree(project: str = "relay-engine", backend_dir: str = "backend", frontend_dir: str = "frontend"):
    """Return the current file tree under data/{project}/."""
    project_dir = DATA_DIR / project

    if not project_dir.exists():
        return {"backend": [], "frontend": []}

    def collect(base: Path) -> list[str]:
        if not base.exists():
            return []
        return sorted(
            str(p.relative_to(base))
            for p in base.rglob("*")
            if p.is_file()
        )

    return {
        "backend": collect(project_dir / backend_dir),
        "frontend": collect(project_dir / frontend_dir),
    }
