const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
}

function colorize(color, text) {
  if (!process.stdout.isTTY) return text
  return `${COLORS[color] || ''}${text}${COLORS.reset}`
}

export function info(message) {
  process.stdout.write(`${colorize('cyan', '[ai-fde]')} ${message}\n`)
}

export function success(message) {
  process.stdout.write(`${colorize('green', '[ai-fde]')} ${message}\n`)
}

export function warn(message) {
  process.stderr.write(`${colorize('yellow', '[ai-fde] warn')} ${message}\n`)
}

export function error(message) {
  process.stderr.write(`${colorize('red', '[ai-fde] error')} ${message}\n`)
}

export function muted(message) {
  process.stdout.write(`${colorize('dim', message)}\n`)
}
