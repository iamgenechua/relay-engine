import fs from 'node:fs'
import path from 'node:path'
import { loadConfig } from '../lib/config.js'
import { defaultComponentInstallDir, getComponentRegistry, resolveComponents } from '../templates/registry.js'
import { isTruthy } from '../lib/utils.js'

function detectTypeScript(cwd, frontendDir, options) {
  if (options.jsx !== undefined && isTruthy(options.jsx)) return false
  if (options.tsx !== undefined && isTruthy(options.tsx)) return true

  if (fs.existsSync(path.join(frontendDir, 'tsconfig.json'))) return true
  if (fs.existsSync(path.join(cwd, 'tsconfig.json'))) return true

  const srcDir = fs.existsSync(path.join(frontendDir, 'src'))
    ? path.join(frontendDir, 'src')
    : frontendDir

  if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) return false

  function hasTypeScriptFiles(dir, depth = 3) {
    if (depth < 0) return false
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (['node_modules', '.next', 'dist', 'build', '.git'].includes(entry.name)) continue
        if (hasTypeScriptFiles(absolute, depth - 1)) return true
        continue
      }

      if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
        return true
      }
    }
    return false
  }

  return hasTypeScriptFiles(srcDir)
}

function writeFile({ filePath, source, overwrite }) {
  if (fs.existsSync(filePath) && !overwrite) {
    return { written: false, skipped: true }
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, source, 'utf-8')
  return { written: true, skipped: false }
}

export function runAdd({ cwd, options = {}, components = [], logger }) {
  const listOnly = options.list !== undefined && isTruthy(options.list)
  if (listOnly) {
    const useTypeScript = options.tsx !== undefined && isTruthy(options.tsx)
    const registry = getComponentRegistry(useTypeScript)
    const available = Object.values(registry).map((item) => ({
      name: item.name,
      description: item.description,
    }))
    return {
      mode: 'list',
      available,
      useTypeScript,
    }
  }

  const config = loadConfig(cwd)
  const frontendDir = path.resolve(cwd, String(options.frontend || config?.frontendDir || '.'))

  if (!fs.existsSync(frontendDir) || !fs.statSync(frontendDir).isDirectory()) {
    throw new Error(`Frontend directory does not exist: ${frontendDir}`)
  }

  const useTypeScript = detectTypeScript(cwd, frontendDir, options)
  const registry = getComponentRegistry(useTypeScript)

  const requested = components.length > 0 ? components : ['chat-panel', 'floating-panel']
  const unknown = requested.filter((name) => !registry[name])
  if (unknown.length > 0) {
    throw new Error(`Unknown components: ${unknown.join(', ')}. Run \`ai-fde add --list\`.`)
  }

  const installRoot = options.path
    ? path.resolve(frontendDir, String(options.path))
    : defaultComponentInstallDir(frontendDir)

  const resolved = resolveComponents(requested, registry)
  const overwrite = options.overwrite !== undefined ? isTruthy(options.overwrite) : false

  const files = []
  for (const component of resolved) {
    for (const file of component.files) {
      const destination = path.join(installRoot, file.relativePath)
      const result = writeFile({
        filePath: destination,
        source: file.source,
        overwrite,
      })
      files.push({
        component: component.name,
        relativePath: path.relative(cwd, destination),
        written: result.written,
        skipped: result.skipped,
      })
    }
  }

  if (logger) {
    const writtenCount = files.filter((f) => f.written).length
    const skippedCount = files.filter((f) => f.skipped).length
    logger.success(`Component install complete. Written=${writtenCount}, skipped=${skippedCount}.`)
  }

  return {
    mode: 'install',
    requested,
    installed: resolved.map((item) => item.name),
    installRoot: path.relative(cwd, installRoot) || '.',
    useTypeScript,
    files,
  }
}
