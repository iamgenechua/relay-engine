import fs from 'node:fs'
import path from 'node:path'
import { toPosix } from './utils.js'

function findFirstExisting(rootDir, candidates) {
  for (const candidate of candidates) {
    const absolute = path.join(rootDir, candidate)
    if (fs.existsSync(absolute)) {
      return absolute
    }
  }
  return null
}

function toModuleImportPath(fromDir, targetFile) {
  let relative = toPosix(path.relative(fromDir, targetFile))
  if (!relative.startsWith('.')) {
    relative = `./${relative}`
  }
  return relative.replace(/\.js$/, '')
}

function writeIfChanged(filePath, content) {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf-8')
    if (existing === content) return false
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf-8')
  return true
}

function detectSourceRoot(frontendDir) {
  const srcDir = path.join(frontendDir, 'src')
  if (fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory()) {
    return srcDir
  }
  return frontendDir
}

function buildRelayClientTemplate({ project, apiBaseUrl }) {
  return `/* eslint-disable no-console */
const AIFDE_PROJECT = ${JSON.stringify(project)}
const AIFDE_API_BASE = ${JSON.stringify(apiBaseUrl.replace(/\/+$/, ''))}
const SESSION_KEY = '__aifde_session_id'
const ID_ATTR = 'data-relay-id'

let didInit = false
let idCounter = 0

function getSessionId() {
  try {
    const posthogSession = window.posthog?.get_session_id?.()
    if (posthogSession) return String(posthogSession)

    let existing = sessionStorage.getItem(SESSION_KEY)
    if (!existing) {
      existing = crypto.randomUUID()
      sessionStorage.setItem(SESSION_KEY, existing)
    }
    return existing
  } catch {
    return 'unknown-session'
  }
}

function getUserId() {
  try {
    const posthogDistinct = window.posthog?.get_distinct_id?.()
    if (posthogDistinct) return String(posthogDistinct)

    const fromWindow = window.__AIFDE_USER_ID__
    if (fromWindow) return String(fromWindow)

    const keys = ['userId', 'user_id', 'uid', 'id']
    for (const key of keys) {
      const value = localStorage.getItem(key)
      if (value) return value
    }
  } catch {
    // ignored
  }

  return 'anonymous'
}

function emit(event, payload = {}) {
  const body = {
    source: 'frontend',
    event,
    project: AIFDE_PROJECT,
    sessionId: getSessionId(),
    userId: getUserId(),
    timestamp: new Date().toISOString(),
    href: window.location.href,
    path: window.location.pathname,
    ...payload,
  }

  try {
    window.posthog?.capture?.(\`aifde_\${event}\`, body)
  } catch {
    // ignored
  }

  if (!AIFDE_API_BASE) return
  const endpoint = AIFDE_API_BASE + '/ingest'

  try {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ignored
  }
}

function shouldSkipTag(tagName) {
  return ['SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD', 'TITLE', 'BASE'].includes(tagName)
}

function ensureRelayIds(node) {
  if (!(node instanceof HTMLElement)) return
  if (shouldSkipTag(node.tagName)) return

  if (!node.hasAttribute(ID_ATTR)) {
    idCounter += 1
    node.setAttribute(ID_ATTR, \`relay-\${AIFDE_PROJECT}-\${idCounter}\`)
  }

  if (!node.id) {
    node.id = node.getAttribute(ID_ATTR)
  }
}

function assignIds(root = document.body) {
  if (!root) return
  ensureRelayIds(root)
  const elements = root.querySelectorAll('*')
  for (const element of elements) {
    ensureRelayIds(element)
  }
}

function observeDom() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const added of mutation.addedNodes) {
        if (added instanceof HTMLElement) {
          assignIds(added)
        }
      }
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

function shouldSkipNetworkLog(urlString) {
  try {
    const url = new URL(urlString, window.location.origin)
    const relayApi = AIFDE_API_BASE ? new URL(AIFDE_API_BASE) : null
    if (!relayApi) return false

    const sameHost = url.host === relayApi.host
    if (!sameHost) return false
    return url.pathname.endsWith('/ingest') || url.pathname.endsWith('/api/codebase/upload')
  } catch {
    return false
  }
}

function patchFetch() {
  if (window.__AIFDE_FETCH_PATCHED__) return
  window.__AIFDE_FETCH_PATCHED__ = true

  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const startedAt = Date.now()
    const url = typeof input === 'string' ? input : input?.url || ''

    if (!shouldSkipNetworkLog(url)) {
      emit('network_request', {
        method: init?.method || 'GET',
        requestUrl: url,
      })
    }

    const response = await originalFetch(input, init)

    if (!shouldSkipNetworkLog(url)) {
      emit('network_response', {
        method: init?.method || 'GET',
        requestUrl: url,
        status: response.status,
        durationMs: Date.now() - startedAt,
      })
    }

    return response
  }
}

function patchConsole() {
  if (window.__AIFDE_CONSOLE_PATCHED__) return
  window.__AIFDE_CONSOLE_PATCHED__ = true

  const levels = ['log', 'info', 'warn', 'error']
  for (const level of levels) {
    const original = console[level].bind(console)
    console[level] = (...args) => {
      original(...args)
      const message = args.map((value) => {
        if (typeof value === 'string') return value
        try {
          return JSON.stringify(value)
        } catch {
          return String(value)
        }
      }).join(' ')

      emit('console_event', {
        level,
        message: message.slice(0, 1000),
      })
    }
  }
}

function bindGlobalEvents() {
  document.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return

    emit('ui_click', {
      tagName: target.tagName,
      relayId: target.getAttribute(ID_ATTR),
      text: (target.innerText || '').trim().slice(0, 200),
    })
  })

  window.addEventListener('error', (event) => {
    emit('window_error', {
      message: event.message || 'Unknown error',
      source: event.filename || '',
      line: event.lineno || 0,
      column: event.colno || 0,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    emit('window_unhandledrejection', {
      message: String(event.reason || 'Unknown rejection'),
    })
  })
}

export function initAIFDE() {
  if (didInit || typeof window === 'undefined') return
  didInit = true

  assignIds(document.body)
  observeDom()
  patchFetch()
  patchConsole()
  bindGlobalEvents()

  emit('frontend_bootstrap', {
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  })
}
`
}

function findImportInsertionIndex(content) {
  const importPattern = /^import[^\n]+\n/gm
  let match
  let index = 0

  while (true) {
    match = importPattern.exec(content)
    if (!match) break
    index = importPattern.lastIndex
  }

  return index
}

function patchMainEntry(mainFile, importPath) {
  let content = fs.readFileSync(mainFile, 'utf-8')
  if (content.includes('initAIFDE(')) return false

  const importLine = `import { initAIFDE } from '${importPath}'\n`
  const insertionIndex = findImportInsertionIndex(content)
  content = `${content.slice(0, insertionIndex)}${importLine}${content.slice(insertionIndex)}`

  const marker = /createRoot\(|ReactDOM\.render\(|root\.render\(/m
  const markerMatch = marker.exec(content)
  if (markerMatch) {
    const markerIndex = markerMatch.index
    const lineStart = content.lastIndexOf('\n', markerIndex) + 1
    content = `${content.slice(0, lineStart)}initAIFDE()\n${content.slice(lineStart)}`
  } else {
    content += '\n\ninitAIFDE()\n'
  }

  fs.writeFileSync(mainFile, content, 'utf-8')
  return true
}

function patchNextLayout(layoutFile, appDir, sourceRoot) {
  let content = fs.readFileSync(layoutFile, 'utf-8')
  const bootstrapName = 'AIFDEBootstrap'
  const bootstrapExtension = layoutFile.endsWith('.tsx') ? '.tsx' : '.jsx'
  const bootstrapFile = path.join(appDir, `aifde-bootstrap${bootstrapExtension}`)
  const helperPath = path.join(sourceRoot, 'aifde', 'relay-client.js')
  const importPath = `./${path.basename(bootstrapFile, path.extname(bootstrapFile))}`
  const relativeHelperImport = toModuleImportPath(appDir, helperPath)

  const bootstrapContent = `'use client'\n\nimport { useEffect } from 'react'\nimport { initAIFDE } from '${relativeHelperImport.replace(/\.js$/, '')}'\n\nexport function ${bootstrapName}() {\n  useEffect(() => {\n    initAIFDE()\n  }, [])\n\n  return null\n}\n`

  const wroteBootstrap = writeIfChanged(bootstrapFile, bootstrapContent)

  if (!content.includes(`import { ${bootstrapName} }`)) {
    const insertionIndex = findImportInsertionIndex(content)
    const importLine = `import { ${bootstrapName} } from '${importPath}'\n`
    content = `${content.slice(0, insertionIndex)}${importLine}${content.slice(insertionIndex)}`
  }

  if (!content.includes(`<${bootstrapName} />`)) {
    const bodyTag = /<body[^>]*>/m
    if (bodyTag.test(content)) {
      content = content.replace(bodyTag, (value) => `${value}\n        <${bootstrapName} />\n`)
    } else if (content.includes('</body>')) {
      content = content.replace('</body>', `  <${bootstrapName} />\n      </body>`)
    } else {
      content += `\n<${bootstrapName} />\n`
    }
  }

  const original = fs.readFileSync(layoutFile, 'utf-8')
  if (content !== original) {
    fs.writeFileSync(layoutFile, content, 'utf-8')
    return { layoutPatched: true, bootstrapWrote: wroteBootstrap }
  }

  return { layoutPatched: false, bootstrapWrote: wroteBootstrap }
}

function annotateHtmlFiles(frontendDir, project) {
  const changes = []

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (['node_modules', '.next', 'dist', 'build', '.git'].includes(entry.name)) {
          continue
        }
        walk(path.join(currentDir, entry.name))
        continue
      }

      if (!entry.isFile() || !entry.name.endsWith('.html')) continue

      const filePath = path.join(currentDir, entry.name)
      let content = fs.readFileSync(filePath, 'utf-8')
      let count = 0
      content = content.replace(/<([a-z][a-z0-9-]*)([^<>]*?)>/gi, (full, tag, attrs) => {
        const upperTag = String(tag).toUpperCase()
        if (['SCRIPT', 'STYLE', 'META', 'HEAD', 'LINK', 'TITLE', 'BASE'].includes(upperTag)) {
          return full
        }
        if (/\bdata-relay-id\s*=/.test(attrs)) return full

        count += 1
        const relayId = `relay-${project}-${count}`
        const withAttr = `${attrs || ''} data-relay-id="${relayId}"`
        if (/\bid\s*=/.test(attrs)) {
          return `<${tag}${withAttr}>`
        }
        return `<${tag}${withAttr} id="${relayId}">`
      })

      if (count > 0) {
        fs.writeFileSync(filePath, content, 'utf-8')
        changes.push(toPosix(path.relative(frontendDir, filePath)))
      }
    }
  }

  walk(frontendDir)
  return changes
}

export function instrumentFrontend({ frontendDir, project, apiBaseUrl }) {
  const layoutPath = findFirstExisting(frontendDir, [
    'app/layout.tsx',
    'app/layout.jsx',
    'src/app/layout.tsx',
    'src/app/layout.jsx',
  ])

  const mainEntry = findFirstExisting(frontendDir, [
    'src/main.tsx',
    'src/main.jsx',
    'src/main.ts',
    'src/main.js',
    'main.tsx',
    'main.jsx',
    'main.ts',
    'main.js',
  ])

  let sourceRoot = detectSourceRoot(frontendDir)
  if (layoutPath) {
    const relativeLayout = toPosix(path.relative(frontendDir, layoutPath))
    if (relativeLayout.startsWith('app/')) {
      sourceRoot = frontendDir
    } else if (relativeLayout.startsWith('src/app/')) {
      sourceRoot = path.join(frontendDir, 'src')
    }
  } else if (mainEntry) {
    const relativeMain = toPosix(path.relative(frontendDir, mainEntry))
    if (relativeMain.startsWith('src/')) {
      sourceRoot = path.join(frontendDir, 'src')
    } else {
      sourceRoot = frontendDir
    }
  }

  const helperFile = path.join(sourceRoot, 'aifde', 'relay-client.js')
  const wroteHelper = writeIfChanged(
    helperFile,
    buildRelayClientTemplate({ project, apiBaseUrl }),
  )

  let nextLayoutPatched = false
  let bootstrapCreated = false
  if (layoutPath) {
    const appDir = path.dirname(layoutPath)
    const patchResult = patchNextLayout(layoutPath, appDir, sourceRoot)
    nextLayoutPatched = patchResult.layoutPatched
    bootstrapCreated = patchResult.bootstrapWrote
  }

  let mainEntryPatched = false
  if (!layoutPath && mainEntry) {
    const importPath = toModuleImportPath(path.dirname(mainEntry), helperFile)
    mainEntryPatched = patchMainEntry(mainEntry, importPath)
  }

  const htmlFilesAnnotated = annotateHtmlFiles(frontendDir, project)

  return {
    wroteHelper,
    helperFile: toPosix(path.relative(frontendDir, helperFile)),
    nextLayoutPatched,
    bootstrapCreated,
    mainEntryPatched,
    htmlFilesAnnotated,
  }
}
