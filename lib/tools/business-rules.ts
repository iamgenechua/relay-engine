import { readFile } from 'fs/promises'
import path from 'path'

const RULES_PATH = path.join(process.cwd(), 'docs/BUSINESS_RULES.md')

export async function searchBusinessRules(
  query: string
): Promise<string> {
  try {
    const content = await readFile(RULES_PATH, 'utf-8')
    const sections = content.split(/(?=^## )/m)

    const queryLower = query.toLowerCase()
    const matches = sections.filter((section) =>
      section.toLowerCase().includes(queryLower)
    )

    if (matches.length > 0) {
      return matches.join('\n\n---\n\n')
    }

    return content
  } catch {
    return 'Business rules document not found.'
  }
}
