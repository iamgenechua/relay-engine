import { requireConfig } from '../lib/config.js'

export function runConfigShow({ cwd }) {
  return requireConfig(cwd)
}
