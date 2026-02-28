import fs from 'node:fs'
import path from 'node:path'
import { toPosix } from './utils.js'

function exists(filePath) {
  return fs.existsSync(filePath)
}

function writeIfChanged(filePath, content) {
  if (exists(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf-8')
    if (existing === content) return false
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf-8')
  return true
}

function findFirst(rootDir, candidates) {
  for (const candidate of candidates) {
    const absolute = path.join(rootDir, candidate)
    if (exists(absolute)) return absolute
  }
  return null
}

function directoryHasExtension(rootDir, extension, depth = 2) {
  if (depth < 0) return false

  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
  for (const entry of entries) {
    const absolute = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', '.git', '.venv', 'venv', '__pycache__'].includes(entry.name)) continue
      if (directoryHasExtension(absolute, extension, depth - 1)) return true
      continue
    }

    if (entry.isFile() && entry.name.endsWith(extension)) {
      return true
    }
  }

  return false
}

function detectBackendType(backendDir) {
  if (exists(path.join(backendDir, 'pyproject.toml')) || exists(path.join(backendDir, 'requirements.txt'))) {
    return 'python'
  }

  if (exists(path.join(backendDir, 'package.json'))) {
    return 'node'
  }

  if (directoryHasExtension(backendDir, '.py')) {
    return 'python'
  }

  if (directoryHasExtension(backendDir, '.js') || directoryHasExtension(backendDir, '.ts')) {
    return 'node'
  }

  return 'unknown'
}

function buildFastApiHelper({ project, apiBaseUrl }) {
  return `from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from pathlib import Path

import httpx
from fastapi import Request


def _header(request: Request, names: list[str], fallback: str) -> str:
    for name in names:
        value = request.headers.get(name)
        if value:
            return value
    return fallback


async def _ship(payload: dict, relay_api_base: str) -> None:
    if not relay_api_base:
        return

    endpoint = relay_api_base.rstrip("/") + "/ingest"

    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            await client.post(endpoint, json=payload)
    except Exception:
        # Never block request handling on telemetry delivery.
        return


def install_aifde_backend(app, *, project_name: str = ${JSON.stringify(project)}, relay_api_base: str = ${JSON.stringify(apiBaseUrl)}):
    stream_path = Path(os.environ.get("AIFDE_STREAM_PATH", "data/aifde-backend-stream.ndjson"))
    stream_path.parent.mkdir(parents=True, exist_ok=True)

    @app.middleware("http")
    async def aifde_middleware(request: Request, call_next):
        started = time.time()
        session_id = _header(request, ["x-session-id", "x-relay-session-id", "x-aifde-session-id"], fallback=str(uuid.uuid4()))
        user_id = _header(request, ["x-user-id", "x-relay-user-id", "x-aifde-user-id"], fallback="anonymous")

        payload_base = {
            "source": "backend",
            "project": project_name,
            "sessionId": session_id,
            "userId": user_id,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "method": request.method,
            "path": request.url.path,
        }

        try:
            response = await call_next(request)
            duration_ms = int((time.time() - started) * 1000)

            payload = {
                **payload_base,
                "event": "backend_request",
                "status": response.status_code,
                "durationMs": duration_ms,
            }

            with stream_path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(payload) + "\\n")

            asyncio.create_task(_ship(payload, relay_api_base))
            response.headers.setdefault("x-aifde-session-id", session_id)
            return response
        except Exception as exc:
            duration_ms = int((time.time() - started) * 1000)
            payload = {
                **payload_base,
                "event": "backend_exception",
                "status": 500,
                "durationMs": duration_ms,
                "error": str(exc),
            }
            with stream_path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(payload) + "\\n")
            asyncio.create_task(_ship(payload, relay_api_base))
            raise
`
}

function patchFastApiEntry(mainFile, { project, apiBaseUrl }) {
  let content = fs.readFileSync(mainFile, 'utf-8')
  if (content.includes('install_aifde_backend(')) return false

  const importLine = 'from aifde_backend import install_aifde_backend'
  if (!content.includes(importLine)) {
    const importPattern = /^(from\s+[^\n]+\s+import\s+[^\n]+|import\s+[^\n]+)\n/gm
    let lastIndex = 0
    let match
    while (true) {
      match = importPattern.exec(content)
      if (!match) break
      lastIndex = importPattern.lastIndex
    }

    content = `${content.slice(0, lastIndex)}${importLine}\n${content.slice(lastIndex)}`
  }

  const appPattern = /^app\s*=\s*FastAPI\([^\n]*\)\s*$/m
  const appMatch = appPattern.exec(content)
  const installCall = `install_aifde_backend(app, project_name=${JSON.stringify(project)}, relay_api_base=${JSON.stringify(apiBaseUrl)})`

  if (appMatch) {
    const insertAt = appMatch.index + appMatch[0].length
    content = `${content.slice(0, insertAt)}\n${installCall}${content.slice(insertAt)}`
  } else {
    content += `\n\n${installCall}\n`
  }

  fs.writeFileSync(mainFile, content, 'utf-8')
  return true
}

function buildExpressHelper({ project, apiBaseUrl, esm }) {
  const source = `/* eslint-disable no-console */
import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_PROJECT = ${JSON.stringify(project)}
const DEFAULT_RELAY_API_BASE = ${JSON.stringify(apiBaseUrl)}

function appendStream(payload) {
  const streamPath = process.env.AIFDE_STREAM_PATH || 'data/aifde-backend-stream.ndjson'
  const absolute = path.resolve(process.cwd(), streamPath)
  fs.mkdirSync(path.dirname(absolute), { recursive: true })
  fs.appendFileSync(absolute, JSON.stringify(payload) + '\\n', 'utf-8')
}

async function ship(payload, relayApiBase) {
  if (!relayApiBase) return
  const endpoint = relayApiBase.replace(/\\/+$/, '') + '/ingest'

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // ignored
  }
}

export function createRelayMiddleware({ project = DEFAULT_PROJECT, relayApiBase = DEFAULT_RELAY_API_BASE } = {}) {
  return async function relayMiddleware(req, res, next) {
    const startedAt = Date.now()
    const sessionId = req.headers['x-session-id'] || req.headers['x-relay-session-id'] || req.headers['x-aifde-session-id'] || 'unknown-session'
    const userId = req.headers['x-user-id'] || req.headers['x-relay-user-id'] || req.headers['x-aifde-user-id'] || 'anonymous'

    res.on('finish', () => {
      const payload = {
        source: 'backend',
        event: 'backend_request',
        project,
        sessionId,
        userId,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      }
      appendStream(payload)
      ship(payload, relayApiBase)
    })

    next()
  }
}
`

  if (esm) {
    return source
  }

  return source
    .replace("import fs from 'node:fs'", "const fs = require('node:fs')")
    .replace("import path from 'node:path'", "const path = require('node:path')")
    .replace('export function createRelayMiddleware', 'function createRelayMiddleware')
    + '\nmodule.exports = { createRelayMiddleware }\n'
}

function patchExpressEntry(mainFile, helperName, esm, { project, apiBaseUrl }) {
  let content = fs.readFileSync(mainFile, 'utf-8')
  if (content.includes('createRelayMiddleware(')) return false

  const importLine = esm
    ? `import { createRelayMiddleware } from './${helperName}'`
    : `const { createRelayMiddleware } = require('./${helperName.replace(/\.js$/, '')}')`

  const importPattern = /^import[^\n]+\n/gm
  let insertIndex = 0

  if (esm) {
    let match
    while (true) {
      match = importPattern.exec(content)
      if (!match) break
      insertIndex = importPattern.lastIndex
    }
    content = `${content.slice(0, insertIndex)}${importLine}\n${content.slice(insertIndex)}`
  } else {
    const requirePattern = /^const\s+[^\n]+=\s+require\([^\n]+\)\n/gm
    let match
    while (true) {
      match = requirePattern.exec(content)
      if (!match) break
      insertIndex = requirePattern.lastIndex
    }
    content = `${content.slice(0, insertIndex)}${importLine}\n${content.slice(insertIndex)}`
  }

  const appUseCall = `app.use(createRelayMiddleware({ project: ${JSON.stringify(project)}, relayApiBase: ${JSON.stringify(apiBaseUrl)} }))`
  const appDecl = /app\s*=\s*express\(\)/m
  const appDeclMatch = appDecl.exec(content)
  if (appDeclMatch) {
    const insertionPoint = content.indexOf('\n', appDeclMatch.index) + 1
    content = `${content.slice(0, insertionPoint)}${appUseCall}\n${content.slice(insertionPoint)}`
  } else {
    content += `\n${appUseCall}\n`
  }

  fs.writeFileSync(mainFile, content, 'utf-8')
  return true
}

function instrumentPythonBackend(backendDir, project, apiBaseUrl) {
  const helperFile = path.join(backendDir, 'aifde_backend.py')
  const helperCreated = writeIfChanged(helperFile, buildFastApiHelper({ project, apiBaseUrl }))

  const mainFile = findFirst(backendDir, ['main.py', 'app/main.py', 'src/main.py'])
  let entryPatched = false

  if (mainFile) {
    const content = fs.readFileSync(mainFile, 'utf-8')
    if (content.includes('FastAPI(')) {
      entryPatched = patchFastApiEntry(mainFile, { project, apiBaseUrl })
    }
  }

  return {
    backendType: 'python',
    helperCreated,
    helperFile: toPosix(path.relative(backendDir, helperFile)),
    entryPatched,
    entryFile: mainFile ? toPosix(path.relative(backendDir, mainFile)) : null,
  }
}

function instrumentNodeBackend(backendDir, project, apiBaseUrl) {
  const packageFile = path.join(backendDir, 'package.json')
  let esm = false
  if (exists(packageFile)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf-8'))
      esm = pkg.type === 'module'
    } catch {
      esm = false
    }
  }

  const helperName = esm ? 'aifde-backend.mjs' : 'aifde-backend.js'
  const helperFile = path.join(backendDir, helperName)
  const helperCreated = writeIfChanged(
    helperFile,
    buildExpressHelper({ project, apiBaseUrl, esm }),
  )

  const mainFile = findFirst(backendDir, [
    'server.js',
    'index.js',
    'app.js',
    'src/server.js',
    'src/index.js',
    'src/app.js',
  ])

  let entryPatched = false
  if (mainFile) {
    const content = fs.readFileSync(mainFile, 'utf-8')
    if (content.includes('express(')) {
      entryPatched = patchExpressEntry(mainFile, helperName, esm, { project, apiBaseUrl })
    }
  }

  return {
    backendType: 'node',
    helperCreated,
    helperFile: toPosix(path.relative(backendDir, helperFile)),
    entryPatched,
    entryFile: mainFile ? toPosix(path.relative(backendDir, mainFile)) : null,
  }
}

export function instrumentBackend({ backendDir, project, apiBaseUrl }) {
  const backendType = detectBackendType(backendDir)

  if (backendType === 'python') {
    return instrumentPythonBackend(backendDir, project, apiBaseUrl)
  }

  if (backendType === 'node') {
    return instrumentNodeBackend(backendDir, project, apiBaseUrl)
  }

  return {
    backendType: 'unknown',
    helperCreated: false,
    helperFile: null,
    entryPatched: false,
    entryFile: null,
  }
}
