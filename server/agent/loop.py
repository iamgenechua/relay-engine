from __future__ import annotations

import json
import logging
import uuid
from collections.abc import AsyncGenerator

from openai import AsyncOpenAI

from agent.config import OPENAI_API_KEY
from agent.models import ChatMessage, FDERequest
from agent.tools import TOOL_DEFINITIONS, execute_tool

logger = logging.getLogger("relay")

MAX_STEPS = 5

client = AsyncOpenAI(api_key=OPENAI_API_KEY)


def build_system_prompt(req: FDERequest) -> str:
    prompt = (
        "You are Relay — an empathetic, proactive customer success agent embedded in a web application. "
        "Your role is to help users who encounter problems by investigating the root cause, "
        "explaining what went wrong in plain language, and proactively suggesting how to solve or work around the issue.\n\n"
        "## Personality\n"
        "- Lead with empathy. Acknowledge frustration before investigating.\n"
        "- Never use technical jargon with users. Speak plainly and warmly.\n"
        "- Be proactive — don't just explain the problem, offer a solution or workaround.\n"
        "- Investigate before asking — use your tools to gather context first, then ask the user only if needed.\n"
        "- Be concise. Users are frustrated; don't make them read walls of text.\n\n"
        "## Investigation Process\n"
        "1. Check the user's recent events with getUserEvents to understand what they did.\n"
        "2. Search business rules with searchBusinessRules to check if the behavior is intentional.\n"
        "3. Read source code with readSourceFile to understand the implementation — check both "
        "frontend code (app/, components/, lib/) and backend code (server/, app/api/) to fully "
        "understand the logic. For example, API routes live in app/api/ and server logic in server/.\n"
        "4. Once you understand the issue, proactively help the user:\n"
        "   - If it's a user error, explain what they need to do differently and guide them step by step.\n"
        "   - If it's a bug or limitation, explain what's happening and suggest a workaround if one exists.\n"
        "   - If the issue requires an engineering fix, classify it with classifyIssue and let the user know.\n\n"
        "## Classification Guidelines\n"
        "- **bug**: The code does something it shouldn't. Broken logic, crashes, wrong data.\n"
        "- **ux_issue**: The code works as designed, but the design creates confusion or frustration.\n"
        "- **edge_case**: A scenario the code doesn't handle well. Not broken, but not graceful either.\n\n"
        "After classifying, give the user a brief, friendly summary of what you found, what they can do "
        "right now (if anything), and that the engineering team has been notified for a permanent fix."
    )

    if req.frontendLogs:
        logs_text = "\n".join(
            f"  [{l.timestamp}] {l.level}: {l.message}" for l in req.frontendLogs
        )
        prompt += f"\n\n## Frontend Logs\n```\n{logs_text}\n```"

    if req.backendLogs:
        logs_text = "\n".join(
            f"  [{l.timestamp}] {l.level}: {l.message}" for l in req.backendLogs
        )
        prompt += f"\n\n## Backend Logs\n```\n{logs_text}\n```"

    if req.elementContext:
        ec = req.elementContext
        prompt += (
            f"\n\n## Element Context\n"
            f"The user selected this element on the page:\n"
            f"- Element: {ec.elementName}\n"
            f"- CSS Selector: {ec.cssSelector}\n"
            f"- Visible Text: {ec.visibleText}"
        )

    if req.errorMessage:
        prompt += f'\n\n## Error Context\nAn error was detected on the page: "{req.errorMessage}"\n'
        if req.autoTriggered:
            prompt += (
                "The chat was auto-triggered by the error. "
                "Start by acknowledging the error and investigating it immediately — "
                "the user did not initiate this conversation, so be proactive."
            )
        else:
            prompt += "The chat was manually opened by the user."

    if req.sessionId:
        prompt += f'\n\n## Session\nThe user\'s PostHog session ID is: "{req.sessionId}". Use this when calling getUserEvents.'

    if req.codebaseSnapshotPaths:
        prompt += (
            "\n\n## Codebase Snapshot Paths\n"
            "The following source files are relevant to this issue:\n"
            + "\n".join(f"- {p}" for p in req.codebaseSnapshotPaths)
        )

    return prompt


def _data(payload: dict | str) -> str:
    """Format a single SSE data line."""
    if isinstance(payload, str):
        return f"data: {payload}\n\n"
    return f"data: {json.dumps(payload)}\n\n"


async def run_fde_stream(req: FDERequest) -> AsyncGenerator[str, None]:
    logger.info("[stream] Starting agent loop")
    system_prompt = build_system_prompt(req)
    message_id = f"msg_{uuid.uuid4().hex[:12]}"

    element_context_str = ""
    if req.elementContext:
        ec = req.elementContext
        element_context_str = f"{ec.elementName} ({ec.cssSelector})"

    openai_messages: list[dict] = [
        {"role": "system", "content": system_prompt},
    ]
    for m in req.messages:
        openai_messages.append({"role": m.role, "content": m.content})

    # Running counters for unique IDs
    text_counter = 0

    yield _data({"type": "start", "messageId": message_id})

    try:
        for _step in range(MAX_STEPS):
            yield _data({"type": "start-step"})

            logger.info("[stream] Step %d — calling OpenAI (%d messages)", _step + 1, len(openai_messages))
            stream = await client.chat.completions.create(
                model="gpt-4.1",
                messages=openai_messages,
                tools=TOOL_DEFINITIONS,
                stream=True,
            )

            # Accumulators for the streamed response
            text_buffer = ""
            tool_calls_acc: dict[int, dict] = {}  # index -> {id, name, arguments_str}
            text_started = False
            text_counter += 1
            text_id = f"text-{text_counter}"

            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta is None:
                    continue

                # Stream text content
                if delta.content:
                    if not text_started:
                        yield _data({"type": "text-start", "id": text_id})
                        text_started = True
                    text_buffer += delta.content
                    yield _data({"type": "text-delta", "id": text_id, "delta": delta.content})

                # Accumulate tool call fragments
                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = tc.index
                        if idx not in tool_calls_acc:
                            tool_calls_acc[idx] = {"id": "", "name": "", "arguments_str": ""}
                        if tc.id:
                            tool_calls_acc[idx]["id"] = tc.id
                        if tc.function and tc.function.name:
                            tool_calls_acc[idx]["name"] = tc.function.name
                        if tc.function and tc.function.arguments:
                            tool_calls_acc[idx]["arguments_str"] += tc.function.arguments

            # Close text span if we started one
            if text_started:
                yield _data({"type": "text-end", "id": text_id})

            # Check finish reason
            finish_reason = chunk.choices[0].finish_reason if chunk.choices else None

            # If the model produced text only (no tool calls), finish step and done
            if not tool_calls_acc:
                yield _data({"type": "finish-step"})
                break

            # Build the assistant message with tool calls for the conversation
            assistant_tool_calls = []
            for idx in sorted(tool_calls_acc):
                tc_data = tool_calls_acc[idx]
                assistant_tool_calls.append({
                    "id": tc_data["id"],
                    "type": "function",
                    "function": {
                        "name": tc_data["name"],
                        "arguments": tc_data["arguments_str"],
                    },
                })

            assistant_msg: dict = {"role": "assistant"}
            if text_buffer:
                assistant_msg["content"] = text_buffer
            if assistant_tool_calls:
                assistant_msg["tool_calls"] = assistant_tool_calls
            openai_messages.append(assistant_msg)

            # Execute each tool call and emit events
            for idx in sorted(tool_calls_acc):
                tc_data = tool_calls_acc[idx]
                tool_name = tc_data["name"]
                tool_call_id = tc_data["id"]
                try:
                    arguments = json.loads(tc_data["arguments_str"])
                except json.JSONDecodeError:
                    arguments = {}

                yield _data({
                    "type": "tool-input-start",
                    "toolCallId": tool_call_id,
                    "toolName": tool_name,
                })
                yield _data({
                    "type": "tool-input-available",
                    "toolCallId": tool_call_id,
                    "toolName": tool_name,
                    "input": arguments,
                })

                logger.info("[stream] Executing tool %s(%s)", tool_name, json.dumps(arguments)[:200])
                result = await execute_tool(
                    tool_name,
                    arguments,
                    element_context=element_context_str,
                    messages=req.messages,
                )

                yield _data({
                    "type": "tool-output-available",
                    "toolCallId": tool_call_id,
                    "output": result,
                })

                # Feed tool result back into conversation
                openai_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": json.dumps(result),
                })

            yield _data({"type": "finish-step"})

            # If finish_reason was "stop" (not "tool_calls"), we're done
            if finish_reason == "stop":
                break

    except Exception as e:
        logger.error("[stream] Error: %s", e, exc_info=True)
        yield _data({"type": "error", "error": str(e)})

    logger.info("[stream] Done — messageId=%s", message_id)
    yield _data({"type": "finish", "finishReason": "stop"})
    yield "data: [DONE]\n\n"
