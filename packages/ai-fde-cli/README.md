# ai-fde

`ai-fde` now runs as a single guided workflow command for hackathons.

Supported stacks only:
- Next.js frontend (requires `frontend/package.json` with `next`)
- FastAPI backend

## Single Command

```bash
ai-fde collison-install
```

This command walks through:

1. Project setup (project name + frontend/backend folders).
2. Frontend/backend logging instrumentation.
3. CSS relay IDs tagging support.
4. Code upload (`/api/codebase/upload`) separated by frontend/backend folder.
5. Floating panel + provider setup.
6. Final test/deploy confirmation prompts.

If steps are already done, it asks whether to skip or rerun each step.

Step 5 uses a bundled Relay UI template shipped inside the package (`src/templates/relay-engine`).
It also installs support files and deps for the UI:
- `components/posthog-provider.tsx`
- `lib/posthog.ts`
- `lib/relay-collector.ts`
- package deps: `posthog-js`, `@ai-sdk/react`, `ai`, `framer-motion`

During instrumentation, the workflow also invokes Codex CLI (`codex exec`) for LLM-based log insertion without changing business logic.

## Quick Start

```bash
npx ai-fde collison-install
```

Or for local development in this repository:

```bash
node packages/ai-fde-cli/bin/ai-fde.js collison-install
```

## Skip/Rerun Flags

- `--skip-instrument`
- `--skip-upload`
- `--skip-ui`
- `--rerun-instrument`
- `--rerun-upload`
- `--rerun-ui`
- `--yes` (non-interactive; auto-skips already-done steps)
- `--skip-codex-logs`

## Config

The CLI writes `.ai-fde/config.json` in the target repo.
