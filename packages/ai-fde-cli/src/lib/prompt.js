import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

export async function promptText({ label, defaultValue, required = true }) {
  const rl = readline.createInterface({ input, output })
  try {
    const suffix = defaultValue ? ` (${defaultValue})` : ''
    const value = await rl.question(`${label}${suffix}: `)
    const answer = value.trim() || defaultValue || ''

    if (required && !answer) {
      throw new Error(`${label} is required.`)
    }
    return answer
  } finally {
    rl.close()
  }
}

export async function promptConfirm({ label, defaultValue = true }) {
  const rl = readline.createInterface({ input, output })
  try {
    const suffix = defaultValue ? 'Y/n' : 'y/N'
    const value = await rl.question(`${label} [${suffix}]: `)
    const normalized = value.trim().toLowerCase()

    if (!normalized) return defaultValue
    if (['y', 'yes'].includes(normalized)) return true
    if (['n', 'no'].includes(normalized)) return false
    return defaultValue
  } finally {
    rl.close()
  }
}
