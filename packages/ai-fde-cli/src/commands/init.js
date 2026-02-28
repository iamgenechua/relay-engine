import fs from 'node:fs'
import path from 'node:path'
import { loadConfig, saveConfig } from '../lib/config.js'
import { DEFAULT_API_BASE_URL } from '../lib/constants.js'
import { installPreCommitHook, isGitRepository } from '../lib/git.js'
import { promptConfirm, promptText } from '../lib/prompt.js'
import { sanitizeProjectName, stripTrailingSlash } from '../lib/utils.js'
import { runInstrument } from './instrument.js'
import { runUpload } from './upload.js'

function isDirectory(absolutePath) {
  return fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()
}

function detectFrontendDefault(cwd) {
  const candidates = ['frontend', 'web', 'client']
  for (const candidate of candidates) {
    if (isDirectory(path.join(cwd, candidate))) return candidate
  }

  if (isDirectory(path.join(cwd, 'app')) || isDirectory(path.join(cwd, 'pages'))) {
    return '.'
  }

  if (isDirectory(path.join(cwd, 'src'))) {
    return '.'
  }

  return '.'
}

function detectBackendDefault(cwd) {
  const candidates = ['backend', 'server', 'api']
  for (const candidate of candidates) {
    if (isDirectory(path.join(cwd, candidate))) return candidate
  }

  if (isDirectory(path.join(cwd, 'src'))) {
    return '.'
  }

  return '.'
}

function optionDisabled(options, key) {
  if (options[`no-${key}`] !== undefined) return true
  return options[key] === false || options[key] === 'false'
}

export async function runInit({ cwd, options = {}, logger }) {
  const existing = loadConfig(cwd)
  const defaultProject = existing?.project || sanitizeProjectName(path.basename(cwd))
  const defaultFrontend = existing?.frontendDir || detectFrontendDefault(cwd)
  const defaultBackend = existing?.backendDir || detectBackendDefault(cwd)
  const defaultApi = existing?.apiBaseUrl || DEFAULT_API_BASE_URL

  const nonInteractive = Boolean(options.yes)

  const project = sanitizeProjectName(
    options.project
      || (nonInteractive
        ? defaultProject
        : await promptText({
            label: 'Project name',
            defaultValue: defaultProject,
          })),
  )

  const frontendDir = options.frontend
    || (nonInteractive
      ? defaultFrontend
      : await promptText({
          label: 'Frontend directory',
          defaultValue: defaultFrontend,
        }))

  const backendDir = options.backend
    || (nonInteractive
      ? defaultBackend
      : await promptText({
          label: 'Backend directory',
          defaultValue: defaultBackend,
        }))

  const apiBaseUrl = stripTrailingSlash(
    options.api
      || (nonInteractive
        ? defaultApi
        : await promptText({
            label: 'Relay API base URL',
            defaultValue: defaultApi,
          })),
  )

  const resolvedFrontend = path.resolve(cwd, frontendDir)
  const resolvedBackend = path.resolve(cwd, backendDir)

  if (!isDirectory(resolvedFrontend)) {
    throw new Error(`Frontend directory does not exist: ${frontendDir}`)
  }

  if (!isDirectory(resolvedBackend)) {
    throw new Error(`Backend directory does not exist: ${backendDir}`)
  }

  if (path.resolve(resolvedFrontend) === path.resolve(resolvedBackend)) {
    logger.warn('Frontend and backend directories are the same. This is allowed, but uploads may duplicate files.')
  }

  const { configPath, config } = saveConfig(cwd, {
    project,
    frontendDir,
    backendDir,
    apiBaseUrl,
    frontendOutputDir: existing?.frontendOutputDir,
    backendOutputDir: existing?.backendOutputDir,
  })

  logger.success(`Saved config: ${path.relative(cwd, configPath)}`)

  const shouldInstallHook = optionDisabled(options, 'hooks')
    ? false
    : (nonInteractive
      ? true
      : await promptConfirm({ label: 'Install pre-commit git hook for staged uploads?', defaultValue: true }))

  let hookPath = null
  if (shouldInstallHook) {
    if (isGitRepository(cwd)) {
      hookPath = installPreCommitHook(cwd)
      logger.success(`Installed git hook: ${path.relative(cwd, hookPath)}`)
    } else {
      logger.warn('Skipped hook install: not a git repository.')
    }
  }

  const shouldInstrument = optionDisabled(options, 'instrument') ? false : true
  const shouldUpload = optionDisabled(options, 'upload') ? false : true

  let instrumentation = null
  if (shouldInstrument) {
    instrumentation = runInstrument({ cwd, options: config, logger })
  }

  let upload = null
  if (shouldUpload) {
    upload = await runUpload({
      cwd,
      options: {
        stagedOnly: false,
      },
      logger,
    })
  }

  return {
    config,
    hookPath,
    instrumentation,
    upload,
  }
}
