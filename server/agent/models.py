from __future__ import annotations

from pydantic import BaseModel, Field


# -- Request schema ----------------------------------------------------------


class BoundingBox(BaseModel):
    top: float = 0
    left: float = 0
    width: float = 0
    height: float = 0


class ElementContext(BaseModel):
    elementName: str = ""
    cssSelector: str = ""
    visibleText: str = ""
    boundingBox: BoundingBox | None = None


class LogEntry(BaseModel):
    source: str = ""
    level: str = ""
    message: str = ""
    timestamp: str = ""


class ChatMessage(BaseModel):
    role: str
    content: str


class FDERequest(BaseModel):
    messages: list[ChatMessage]
    sessionId: str = "current"
    elementContext: ElementContext | None = None
    errorMessage: str | None = None
    autoTriggered: bool = False
    frontendLogs: list[LogEntry] = Field(default_factory=list)
    backendLogs: list[LogEntry] = Field(default_factory=list)
    codebaseSnapshotPaths: list[str] = Field(default_factory=list)
    recentEvents: list[dict] = Field(default_factory=list)
    pageSnapshot: str = ""


# -- Report / timeline -------------------------------------------------------


class TimelineEvent(BaseModel):
    id: str
    event: str
    description: str
    timestamp: str
    isError: bool = False
    properties: dict | None = None


class Report(BaseModel):
    id: str
    type: str  # "bug" | "edge_case" | "ux_issue"
    title: str
    summary: str
    evidence: str
    userQuote: str
    elementContext: str
    conversationLog: list[ChatMessage]
    eventTimeline: list[TimelineEvent]
    createdAt: str
