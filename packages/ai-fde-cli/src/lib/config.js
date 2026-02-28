import fs from 'node:fs'
import path from 'node:path'
import {
  CONFIG_DIR,
  CONFIG_PATH,
  DEFAULT_API_BASE_URL,
  DEFAULT_BACKEND_OUTPUT_DIR,
  DEFAULT_FRONTEND_OUTPUT_DIR,
} from './constants.js'
import { sanitizeProjectName, stripTrailingSlash, toPosix } from './utils.js'

function normalizeRelativeDirectory(cwd, maybePath) {
  const absolute = path.resolve(cwd, maybePath)
  const relative = toPosix(path.relative(cwd, absolute))
  return relative || '.'
}

export function resolveConfigPath(cwd) {
  return path.join(cwd, CONFIG_PATH)
}

export function loadConfig(cwd) {
  const configPath = resolveConfigPath(cwd)
  if (!fs.existsSync(configPath)) return null

  const raw = fs.readFileSync(configPath, 'utf-8')
  const parsed = JSON.parse(raw)
  return normalizeConfig(parsed, cwd)
}

export function normalizeConfig(input, cwd) {
  const project = sanitizeProjectName(input.project || '')
  const frontendDir = normalizeRelativeDirectory(cwd, input.frontendDir || '.')
  const backendDir = normalizeRelativeDirectory(cwd, input.backendDir || '.')
  const apiBaseUrl = stripTrailingSlash(input.apiBaseUrl || DEFAULT_API_BASE_URL)
  const normalizedBackendPrefixSource = toPosix(backendDir).replace(/^\.\/?/, '').replace(/\/+$/, '')
  const backendPrefix = input.backendPrefix || (normalizedBackendPrefixSource ? `${normalizedBackendPrefixSource}/` : 'backend/')

  return {
    project,
    frontendDir,
    backendDir,
    apiBaseUrl,
    frontendOutputDir: input.frontendOutputDir || DEFAULT_FRONTEND_OUTPUT_DIR,
    backendOutputDir: input.backendOutputDir || DEFAULT_BACKEND_OUTPUT_DIR,
    backendPrefix,
    version: 1,
    updatedAt: new Date().toISOString(),
  }
}

export function saveConfig(cwd, config) {
  const dir = path.join(cwd, CONFIG_DIR)
  fs.mkdirSync(dir, { recursive: true })

  const normalized = normalizeConfig(config, cwd)
  const configPath = resolveConfigPath(cwd)
  fs.writeFileSync(configPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf-8')

  return { configPath, config: normalized }
}

export function requireConfig(cwd) {
  const config = loadConfig(cwd)
  if (!config) {
    throw new Error('Missing .ai-fde/config.json. Run `ai-fde init` first.')
  }
  return config
}
