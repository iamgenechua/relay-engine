import path from 'node:path'

export function toPosix(inputPath) {
  return inputPath.split(path.sep).join('/')
}

export function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '')
}

export function sanitizeProjectName(value) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug || 'hackathon-project'
}

export function toRelativePath(fromRoot, absolutePath) {
  return toPosix(path.relative(fromRoot, absolutePath))
}

export function parseArgs(argv) {
  const options = {}
  const positionals = []

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) {
      positionals.push(token)
      continue
    }

    const [rawKey, inlineValue] = token.slice(2).split('=', 2)
    const key = rawKey.trim()
    if (!key) continue

    if (inlineValue !== undefined) {
      options[key] = inlineValue
      continue
    }

    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      options[key] = true
      continue
    }

    options[key] = next
    i += 1
  }

  return { options, positionals }
}

export function isTruthy(value) {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return false
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase())
}
