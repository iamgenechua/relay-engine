from __future__ import annotations

import os

import httpx

from agent.config import POSTHOG_HOST, POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID, PROJECT_ROOT

# Uploaded codebase lives under data/{project}/frontend/
CODEBASE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "relay-engine", "frontend")
from agent.models import ChatMessage
from agent.store import add_report

# -- Mock data (fallback when PostHog is not configured) ---------------------

MOCK_TIMELINE_EVENTS: list[dict] = [
    {"id": "evt-1", "event": "pageview", "description": "Viewed Orders list", "timestamp": "0:00"},
    {"id": "evt-2", "event": "click", "description": "Opened Order ORD-001", "timestamp": "0:03"},
    {"id": "evt-3", "event": "click", "description": "Clicked status dropdown", "timestamp": "0:07"},
    {"id": "evt-4", "event": "click", "description": 'Selected "Shipped"', "timestamp": "0:09"},
    {
        "id": "evt-5",
        "event": "api_error",
        "description": "Status update failed: Invalid transition",
        "timestamp": "0:10",
        "isError": True,
    },
]

# -- OpenAI tool definitions -------------------------------------------------

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "getUserEvents",
            "description": (
                "Get the recent event timeline for the current user session. "
                "Shows what pages they visited, what they clicked, and any errors."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sessionId": {
                        "type": "string",
                        "description": 'The session ID to look up events for. Use "current" for the active session.',
                    },
                },
                "required": ["sessionId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "readSourceFile",
            "description": (
                "Read a source file from the project. "
                "Restricted to app/, components/, lib/, docs/, and server/ directories. "
                "Use this to inspect API routes (app/api/), server actions, "
                "and backend logic (server/) to diagnose issues."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "filePath": {
                        "type": "string",
                        "description": 'The file path relative to the project root, e.g. "app/api/orders/[id]/status/route.ts"',
                    },
                },
                "required": ["filePath"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "searchBusinessRules",
            "description": (
                "Search the business rules document to check if observed behavior is "
                'intentional or a known issue. Use keywords like "transition", "stock", '
                '"checkout", "error".'
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query — a keyword or phrase to find in the business rules.",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "classifyIssue",
            "description": (
                "Classify the issue after investigation. This saves a report for the "
                "engineering team. Call this exactly once when you have enough evidence."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["bug", "edge_case", "ux_issue"],
                        "description": "The classification type.",
                    },
                    "title": {
                        "type": "string",
                        "description": 'A short title for the issue, e.g. "Invalid status transition button shown on pending orders".',
                    },
                    "summary": {
                        "type": "string",
                        "description": "A 1-2 sentence summary of what happened and why.",
                    },
                    "evidence": {
                        "type": "string",
                        "description": "Technical evidence — what you found in code, business rules, or event timeline.",
                    },
                    "userQuote": {
                        "type": "string",
                        "description": "A relevant quote from the user describing their experience, or empty string if auto-triggered.",
                    },
                },
                "required": ["type", "title", "summary", "evidence", "userQuote"],
            },
        },
    },
]

# -- Tool implementations ----------------------------------------------------

ALLOWED_PREFIXES = ("app/", "components/", "lib/", "docs/", "server/")
MAX_FILE_CHARS = 5000


async def getUserEvents(sessionId: str) -> dict:
    if not POSTHOG_PERSONAL_API_KEY or not POSTHOG_PROJECT_ID:
        return {"events": MOCK_TIMELINE_EVENTS}

    try:
        url = (
            f"{POSTHOG_HOST}/api/projects/{POSTHOG_PROJECT_ID}"
            f"/events?session_id={sessionId}&limit=20"
        )
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(url, headers={"Authorization": f"Bearer {POSTHOG_PERSONAL_API_KEY}"})

        if res.status_code != 200:
            return {"events": MOCK_TIMELINE_EVENTS}

        data = res.json()
        events = []
        for i, e in enumerate(data.get("results", [])):
            props = e.get("properties", {})
            events.append({
                "id": f"evt-{i}",
                "event": str(e.get("event", "")),
                "description": str(props.get("$current_url", e.get("event", ""))),
                "timestamp": str(e.get("timestamp", "")),
                "isError": "error" in str(e.get("event", "")),
                "properties": props,
            })
        return {"events": events}
    except Exception:
        return {"events": MOCK_TIMELINE_EVENTS}


async def readSourceFile(filePath: str) -> dict:
    normalized = filePath.lstrip("/")

    if not any(normalized.startswith(prefix) for prefix in ALLOWED_PREFIXES):
        return {"content": f"Access denied: only files in {', '.join(ALLOWED_PREFIXES)} are readable."}

    # Try uploaded codebase first, then fall back to PROJECT_ROOT
    codebase_abs = os.path.abspath(CODEBASE_DIR)
    for base_dir in [codebase_abs, PROJECT_ROOT]:
        absolute = os.path.normpath(os.path.join(base_dir, normalized))
        if not absolute.startswith(base_dir):
            continue
        try:
            with open(absolute, "r", encoding="utf-8") as f:
                content = f.read()
            if len(content) > MAX_FILE_CHARS:
                content = content[:MAX_FILE_CHARS] + "\n\n... (truncated at 5000 chars)"
            return {"content": content}
        except FileNotFoundError:
            continue

    return {"content": f"File not found: {filePath}"}


async def searchBusinessRules(query: str) -> dict:
    # Try uploaded codebase first, then fall back to PROJECT_ROOT
    codebase_abs = os.path.abspath(CODEBASE_DIR)
    rules_path = os.path.join(codebase_abs, "docs", "BUSINESS_RULES.md")
    if not os.path.exists(rules_path):
        rules_path = os.path.join(PROJECT_ROOT, "docs", "BUSINESS_RULES.md")
    try:
        with open(rules_path, "r", encoding="utf-8") as f:
            content = f.read()

        import re
        sections = re.split(r"(?=^## )", content, flags=re.MULTILINE)

        query_lower = query.lower()
        matches = [s for s in sections if query_lower in s.lower()]

        if matches:
            return {"rules": "\n\n---\n\n".join(matches)}
        return {"rules": content}
    except FileNotFoundError:
        return {"rules": "Business rules document not found."}


async def classifyIssue(
    *,
    type: str,
    title: str,
    summary: str,
    evidence: str,
    userQuote: str,
    element_context: str = "",
    messages: list[ChatMessage] | None = None,
) -> dict:
    report = add_report(
        type=type,
        title=title,
        summary=summary,
        evidence=evidence,
        user_quote=userQuote,
        element_context=element_context,
        conversation_log=messages or [],
    )
    return {
        "type": report.type,
        "title": report.title,
        "summary": report.summary,
        "evidence": report.evidence,
        "reportId": report.id,
    }


# -- Dispatcher --------------------------------------------------------------

async def execute_tool(
    name: str,
    arguments: dict,
    *,
    element_context: str = "",
    messages: list[ChatMessage] | None = None,
) -> dict:
    if name == "getUserEvents":
        return await getUserEvents(arguments["sessionId"])
    elif name == "readSourceFile":
        return await readSourceFile(arguments["filePath"])
    elif name == "searchBusinessRules":
        return await searchBusinessRules(arguments["query"])
    elif name == "classifyIssue":
        return await classifyIssue(
            type=arguments["type"],
            title=arguments["title"],
            summary=arguments["summary"],
            evidence=arguments["evidence"],
            userQuote=arguments["userQuote"],
            element_context=element_context,
            messages=messages,
        )
    else:
        return {"error": f"Unknown tool: {name}"}
