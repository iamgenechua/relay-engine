import fs from 'node:fs'
import path from 'node:path'
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_FILENAMES,
  DEFAULT_EXCLUDE_DIRS,
  MAX_FILE_BYTES,
  MAX_FILES_PER_CHUNK,
  MAX_CHUNK_BYTES,
} from './constants.js'
import { toPosix } from './utils.js'

function shouldSkipDirectory(name) {
  return DEFAULT_EXCLUDE_DIRS.has(name)
}

function hasAllowedExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const base = path.basename(filePath).toLowerCase()
  return ALLOWED_EXTENSIONS.has(ext) || ALLOWED_FILENAMES.has(base)
}

function isLikelyText(contentBuffer) {
  const max = Math.min(contentBuffer.length, 512)
  let nonText = 0
  for (let i = 0; i < max; i += 1) {
    const code = contentBuffer[i]
    const isControl = code < 9 || (code > 13 && code < 32)
    if (isControl) nonText += 1
  }
  return max === 0 || nonText / max < 0.1
}

function walkFiles(rootDir, currentDir, outFiles) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true })

  for (const entry of entries) {
    const absolute = path.join(currentDir, entry.name)

    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name)) continue
      walkFiles(rootDir, absolute, outFiles)
      continue
    }

    if (!entry.isFile()) continue
    if (!hasAllowedExtension(entry.name)) continue

    const relative = toPosix(path.relative(rootDir, absolute))
    outFiles.push({ absolute, relative })
  }
}

export function collectDirectoryFiles({
  repoRoot,
  sourceDir,
  toUploadPath,
  filterPaths,
}) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Directory does not exist: ${sourceDir}`)
  }

  const discovered = []
  walkFiles(sourceDir, sourceDir, discovered)

  const filterSet = filterPaths ? new Set(filterPaths.map((value) => toPosix(value))) : null
  const files = []

  for (const item of discovered) {
    const relativeFromRepo = toPosix(path.relative(repoRoot, item.absolute))
    if (filterSet && !filterSet.has(relativeFromRepo)) continue

    const stat = fs.statSync(item.absolute)
    if (stat.size > MAX_FILE_BYTES) continue

    const buffer = fs.readFileSync(item.absolute)
    if (!isLikelyText(buffer)) continue

    files.push({
      path: toUploadPath(item.relative),
      content: buffer.toString('utf-8'),
      bytes: stat.size,
      relativeFromRepo,
    })
  }

  return files
}

export function chunkFiles(files) {
  const chunks = []
  let current = []
  let currentBytes = 0

  for (const file of files) {
    const fileBytes = Buffer.byteLength(file.content, 'utf-8')
    const tooManyFiles = current.length >= MAX_FILES_PER_CHUNK
    const tooManyBytes = currentBytes + fileBytes > MAX_CHUNK_BYTES

    if (current.length > 0 && (tooManyFiles || tooManyBytes)) {
      chunks.push(current)
      current = []
      currentBytes = 0
    }

    current.push({ path: file.path, content: file.content })
    currentBytes += fileBytes
  }

  if (current.length > 0) {
    chunks.push(current)
  }

  return chunks
}
