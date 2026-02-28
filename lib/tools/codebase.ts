import { readFile } from 'fs/promises'
import path from 'path'

const ALLOWED_PREFIXES = ['app/', 'components/', 'lib/', 'docs/']
const MAX_CHARS = 5000

export async function readSourceFile(
  filePath: string
): Promise<string> {
  const normalized = filePath.replace(/^\/+/, '')

  const allowed = ALLOWED_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix)
  )
  if (!allowed) {
    return `Access denied: only files in ${ALLOWED_PREFIXES.join(', ')} are readable.`
  }

  try {
    const absolute = path.join(process.cwd(), normalized)
    const content = await readFile(absolute, 'utf-8')
    if (content.length > MAX_CHARS) {
      return content.slice(0, MAX_CHARS) + '\n\n... (truncated at 5000 chars)'
    }
    return content
  } catch {
    return `File not found: ${filePath}`
  }
}
