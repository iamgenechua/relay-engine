from __future__ import annotations

from pydantic import BaseModel, Field


class CodeFile(BaseModel):
    path: str  # relative path from project root, e.g. "app/page.tsx" or "server/main.py"
    content: str


class CodeUploadRequest(BaseModel):
    project: str = "relay-engine"
    backend_dir: str = "backend"
    frontend_dir: str = "frontend"
    backend_prefix: str = "server/"  # file paths starting with this go to backend_dir
    files: list[CodeFile] = Field(default_factory=list)
