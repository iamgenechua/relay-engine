import { requireConfig } from '../lib/config.js'
import { collectUploadFiles, uploadCollectedChunks } from '../lib/upload-workflow.js'
import { isTruthy } from '../lib/utils.js'

export async function runUpload({ cwd, options = {}, logger }) {
  const config = requireConfig(cwd)
  const stagedOnlyRaw = options['staged-only'] !== undefined ? options['staged-only'] : options.stagedOnly
  const stagedOnly = stagedOnlyRaw === undefined ? false : isTruthy(stagedOnlyRaw)

  const { files, chunks, stats, backendPrefix } = collectUploadFiles({
    cwd,
    config,
    stagedOnly,
  })

  if (logger) {
    logger.info(`Prepared ${stats.totalCount} file(s) for upload (${Math.round(stats.totalBytes / 1024)} KiB).`)
  }

  if (files.length === 0) {
    return {
      stats,
      uploads: [],
      skipped: true,
    }
  }

  const uploads = await uploadCollectedChunks({
    config,
    chunks,
    backendPrefix,
    onChunk: logger
      ? ({ index, total, filesInChunk }) => {
          logger.info(`Uploaded chunk ${index + 1}/${total} (${filesInChunk} file(s)).`)
        }
      : undefined,
  })

  return {
    stats,
    uploads,
    skipped: false,
  }
}
