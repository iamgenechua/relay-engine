import { stripTrailingSlash } from './utils.js'

export async function uploadChunk({
  apiBaseUrl,
  project,
  backendOutputDir,
  frontendOutputDir,
  backendPrefix,
  files,
}) {
  const url = `${stripTrailingSlash(apiBaseUrl)}/api/codebase/upload`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project,
      backend_dir: backendOutputDir,
      frontend_dir: frontendOutputDir,
      backend_prefix: backendPrefix,
      files,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Upload failed (${response.status}): ${body}`)
  }

  return response.json()
}
