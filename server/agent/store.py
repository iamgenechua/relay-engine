from __future__ import annotations

import math
import random
from datetime import datetime, timezone

from agent.models import ChatMessage, Report, TimelineEvent

_reports: list[Report] = []


def add_report(
    *,
    type: str,
    title: str,
    summary: str,
    evidence: str,
    user_quote: str,
    element_context: str,
    conversation_log: list[ChatMessage],
    event_timeline: list[TimelineEvent] | None = None,
) -> Report:
    report = Report(
        id=f"RPT-{math.floor(random.random() * 900000) + 100000}",
        type=type,
        title=title,
        summary=summary,
        evidence=evidence,
        userQuote=user_quote,
        elementContext=element_context,
        conversationLog=conversation_log,
        eventTimeline=event_timeline or [],
        createdAt=datetime.now(timezone.utc).isoformat(),
    )
    _reports.append(report)
    return report


def get_reports() -> list[Report]:
    return list(reversed(_reports))
