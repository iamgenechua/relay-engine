from __future__ import annotations

from pydantic import BaseModel, Field


# -- Request schema ----------------------------------------------------------


class ElementContext(BaseModel):
    elementName: str = ""
    cssSelector: str = ""
    visibleText: str = ""


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
