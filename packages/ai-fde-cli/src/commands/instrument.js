import fs from 'node:fs'
import path from 'node:path'
import { instrumentFrontend } from '../lib/instrument-frontend.js'
import { instrumentBackend } from '../lib/instrument-backend.js'
import { requireConfig } from '../lib/config.js'

function resolveOptions(cwd, config, options) {
  return {
    project: String(options.project || config.project),
    apiBaseUrl: String(options.api || config.apiBaseUrl),
    frontendDir: path.resolve(cwd, String(options.frontend || config.frontendDir)),
    backendDir: path.resolve(cwd, String(options.backend || config.backendDir)),
  }
}

export function runInstrument({ cwd, options = {}, logger }) {
  const config = requireConfig(cwd)
  const resolved = resolveOptions(cwd, config, options)

  if (!fs.existsSync(resolved.frontendDir)) {
    throw new Error(`Frontend directory does not exist: ${resolved.frontendDir}`)
  }

  if (!fs.existsSync(resolved.backendDir)) {
    throw new Error(`Backend directory does not exist: ${resolved.backendDir}`)
  }

  if (logger) {
    logger.info(`Instrumenting frontend: ${path.relative(cwd, resolved.frontendDir) || '.'}`)
  }
  const frontend = instrumentFrontend({
    frontendDir: resolved.frontendDir,
    project: resolved.project,
    apiBaseUrl: resolved.apiBaseUrl,
  })

  if (logger) {
    logger.info(`Instrumenting backend: ${path.relative(cwd, resolved.backendDir) || '.'}`)
  }
  const backend = instrumentBackend({
    backendDir: resolved.backendDir,
    project: resolved.project,
    apiBaseUrl: resolved.apiBaseUrl,
  })

  return {
    frontend,
    backend,
  }
}
