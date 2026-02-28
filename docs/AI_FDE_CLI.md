# AI-FDE CLI Design Notes

## What This CLI Does

`ai-fde` is now designed around one guided command:

```bash
ai-fde collison-install
```

The workflow steps are:

1. Ask for project name, frontend folder, backend folder, and Relay API URL.
2. Add frontend/backend logging instrumentation.
3. Add CSS relay IDs support.
4. Upload frontend/backend code to `/api/codebase/upload` based on supplied folders.
5. Add floating panel UI and ensure it is mounted via provider.
6. Ask the user to test UI and confirm deployment.

Supported targets:
- Next.js frontend only
- FastAPI backend only

If a step appears already completed, the CLI asks whether to skip or rerun it.

## Why This Flow Is Low Friction

- Single command (`ai-fde collison-install`) handles setup end-to-end.
- Hook-based snapshots are automatic once installed.
- Upload is chunked and text-only, reducing large request failures.
- Instrumentation is idempotent and safe to rerun.

## Instrumentation Behavior

### Frontend

- Injects `src/aifde/relay-client.js` (or `aifde/relay-client.js`) with:
  - Session ID capture
  - User ID capture
  - PostHog capture wrapper (`window.posthog.capture`)
  - Global click/error/network/console telemetry
  - Runtime DOM tagging (`data-relay-id` and fallback `id`)

- Auto-wires bootstrap:
  - Next.js App Router: patches `app/layout.tsx|jsx` or `src/app/layout.tsx|jsx`.
  - SPA entrypoints: patches `src/main.*` or `main.*`.

### Floating Panel + Provider

- Installs `relay-launcher`, `chat-panel`, `floating-panel`, and `provider` components.
- Installs `components/posthog-provider.tsx`.
- Installs `lib/posthog.ts` and `lib/relay-collector.ts`.
- Ensures required deps in frontend `package.json`: `posthog-js`, `@ai-sdk/react`, `ai`, `framer-motion`.
- Runs an additional Codex CLI (`codex exec`) pass for LLM-based logging instrumentation with a strict prompt to avoid business-logic changes.
- Attempts automatic mount in:
  - `app/layout.tsx|jsx` / `src/app/layout.tsx|jsx`, or
  - `src/main.tsx|jsx` / `main.tsx|jsx`.
- If auto-mount cannot be confirmed, CLI reports manual follow-up.

### Backend

- Python/FastAPI:
  - Writes `aifde_backend.py`.
  - Adds middleware in `main.py` (or `app/main.py`, `src/main.py`) that logs request streams and forwards to `/ingest`.

- Node/Express:
  - Writes `aifde-backend.js|mjs`.
  - Patches common entrypoints to add middleware when Express patterns are detected.

## Upload Critique and Optimization Guidance

### Current risks in hook-first uploads

- `pre-commit` can be noisy/slow for large repos.
- Hook failures can block local velocity if not fail-open.
- Uploading full repo each commit can be expensive.

### Improvements already included

- Hook is fail-open (`exit 0`) to avoid blocking commits.
- Hook defaults to staged-only uploads.
- Files are filtered for text and chunked to avoid oversized payloads.

### Recommended next hardening steps

1. Support `.aifdeignore` patterns for team-level control.
2. Add retries with backoff and per-chunk checksums.
3. Add `pre-push` mode for bigger repositories.
4. Add optional ZIP upload endpoint for very large projects.
5. Add auth token support (`AIFDE_API_TOKEN`) for multi-tenant safety.
6. Return server-side file hash map to skip unchanged content.
