import path from 'node:path'
import { collectDirectoryFiles, chunkFiles } from './file-collector.js'
import { uploadChunk } from './api.js'
import { getStagedFiles } from './git.js'
import { toPosix } from './utils.js'

function normalizePrefix(value) {
  const normalized = toPosix(value || '').replace(/^\.\//, '').replace(/\/+$/, '')
  if (!normalized) return ''
  return `${normalized}/`
}

function withPrefix(prefix, relativePath) {
  if (!prefix) return relativePath
  return `${prefix}${relativePath}`
}

function pathInside(baseRelative, fileRelative) {
  if (baseRelative === '.' || baseRelative === '') return true
  return fileRelative === baseRelative || fileRelative.startsWith(`${baseRelative}/`)
}

export function collectUploadFiles({ cwd, config, stagedOnly = false }) {
  const frontendAbs = path.resolve(cwd, config.frontendDir)
  const backendAbs = path.resolve(cwd, config.backendDir)
  const backendPrefix = normalizePrefix(config.backendPrefix || config.backendDir)

  const stagedFiles = stagedOnly ? getStagedFiles(cwd) : null
  const frontendFilter = stagedFiles
    ? stagedFiles.filter((file) => pathInside(config.frontendDir, file))
    : null
  const backendFilter = stagedFiles
    ? stagedFiles.filter((file) => pathInside(config.backendDir, file))
    : null

  const frontendFiles = collectDirectoryFiles({
    repoRoot: cwd,
    sourceDir: frontendAbs,
    toUploadPath: (relative) => toPosix(relative),
    filterPaths: frontendFilter,
  })

  const backendFiles = collectDirectoryFiles({
    repoRoot: cwd,
    sourceDir: backendAbs,
    toUploadPath: (relative) => withPrefix(backendPrefix, toPosix(relative)),
    filterPaths: backendFilter,
  })

  const dedupedByPath = new Map()
  for (const file of frontendFiles) dedupedByPath.set(file.path, file)
  for (const file of backendFiles) dedupedByPath.set(file.path, file)
  const merged = Array.from(dedupedByPath.values())

  return {
    files: merged,
    chunks: chunkFiles(merged),
    stats: {
      frontendCount: frontendFiles.length,
      backendCount: backendFiles.length,
      dedupedCount: merged.length,
      totalCount: merged.length,
      totalBytes: merged.reduce((sum, file) => sum + file.bytes, 0),
      stagedOnly,
    },
    backendPrefix,
  }
}

export async function uploadCollectedChunks({ config, chunks, backendPrefix, onChunk }) {
  const responses = []

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]
    const response = await uploadChunk({
      apiBaseUrl: config.apiBaseUrl,
      project: config.project,
      backendOutputDir: config.backendOutputDir,
      frontendOutputDir: config.frontendOutputDir,
      backendPrefix,
      files: chunk,
    })

    responses.push(response)

    if (onChunk) {
      onChunk({
        index,
        total: chunks.length,
        filesInChunk: chunk.length,
      })
    }
  }

  return responses
}
