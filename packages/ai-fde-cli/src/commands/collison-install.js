import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { DEFAULT_API_BASE_URL, STATE_PATH } from '../lib/constants.js'
import { loadConfig, saveConfig } from '../lib/config.js'
import { promptConfirm, promptText } from '../lib/prompt.js'
import { isTruthy, sanitizeProjectName, stripTrailingSlash, toPosix } from '../lib/utils.js'
import { runInstrument } from './instrument.js'
import { runUpload } from './upload.js'
import { runAdd } from './add.js'

function isDirectory(absolutePath) {
  return fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()
}

function detectFrontendDefault(cwd) {
  const candidates = ['frontend', 'web', 'client']
  for (const candidate of candidates) {
    if (isDirectory(path.join(cwd, candidate))) return candidate
  }

  if (isDirectory(path.join(cwd, 'app')) || isDirectory(path.join(cwd, 'pages')) || isDirectory(path.join(cwd, 'src'))) {
    return '.'
  }

  return '.'
}

function detectBackendDefault(cwd) {
  const candidates = ['backend', 'server', 'api']
  for (const candidate of candidates) {
    if (isDirectory(path.join(cwd, candidate))) return candidate
  }

  if (isDirectory(path.join(cwd, 'src'))) return '.'
  return '.'
}

function findFirstExisting(rootDir, candidates) {
  for (const candidate of candidates) {
    const absolute = path.join(rootDir, candidate)
    if (fs.existsSync(absolute)) return absolute
  }
  return null
}

function toModuleImportPath(fromDir, targetFile) {
  let relative = toPosix(path.relative(fromDir, targetFile))
  if (!relative.startsWith('.')) relative = `./${relative}`
  return relative.replace(/\.(tsx|jsx|ts|js)$/, '')
}

function readState(cwd) {
  const statePath = path.join(cwd, STATE_PATH)
  if (!fs.existsSync(statePath)) return {}

  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'))
  } catch {
    return {}
  }
}

function writeState(cwd, state) {
  const statePath = path.join(cwd, STATE_PATH)
  fs.mkdirSync(path.dirname(statePath), { recursive: true })
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf-8')
}

function detectInstrumentationDone(frontendAbs, backendAbs) {
  const frontendHelper = findFirstExisting(frontendAbs, [
    'src/aifde/relay-client.js',
    'aifde/relay-client.js',
  ])

  const backendHelper = findFirstExisting(backendAbs, [
    'aifde_backend.py',
    'aifde-backend.js',
    'aifde-backend.mjs',
  ])

  return {
    done: Boolean(frontendHelper && backendHelper),
    frontendHelper,
    backendHelper,
  }
}

function detectUiDone(frontendAbs) {
  const provider = findFirstExisting(frontendAbs, [
    'src/components/relay-engine/provider.tsx',
    'src/components/relay-engine/provider.jsx',
    'components/relay-engine/provider.tsx',
    'components/relay-engine/provider.jsx',
  ])

  const layout = findFirstExisting(frontendAbs, [
    'app/layout.tsx',
    'app/layout.jsx',
    'src/app/layout.tsx',
    'src/app/layout.jsx',
  ])

  const mainEntry = findFirstExisting(frontendAbs, [
    'src/main.tsx',
    'src/main.jsx',
    'main.tsx',
    'main.jsx',
  ])

  let mounted = false
  if (layout && fs.readFileSync(layout, 'utf-8').includes('AIFDEProvider')) {
    mounted = true
  }

  if (!mounted && mainEntry && fs.readFileSync(mainEntry, 'utf-8').includes('AIFDEProvider')) {
    mounted = true
  }

  let hasRelayEngine = false
  const relayPatterns = [
    '<RelayEngine',
    "from '@/components/relay-engine/relay-engine'",
    'components/relay-engine/relay-engine',
  ]
  if (layout) {
    const content = fs.readFileSync(layout, 'utf-8')
    hasRelayEngine = relayPatterns.some((pattern) => content.includes(pattern))
  }
  if (!hasRelayEngine && mainEntry) {
    const content = fs.readFileSync(mainEntry, 'utf-8')
    hasRelayEngine = relayPatterns.some((pattern) => content.includes(pattern))
  }

  return {
    done: Boolean((provider && mounted) || hasRelayEngine),
    provider,
    mounted,
    hasRelayEngine,
  }
}

function ensureImport(content, importLine) {
  if (content.includes(importLine)) return { content, changed: false }

  const importPattern = /^import[^\n]*\n/gm
  let lastIndex = 0
  let match
  while (true) {
    match = importPattern.exec(content)
    if (!match) break
    lastIndex = importPattern.lastIndex
  }

  if (lastIndex > 0) {
    return {
      content: `${content.slice(0, lastIndex)}${importLine}\n${content.slice(lastIndex)}`,
      changed: true,
    }
  }

  return {
    content: `${importLine}\n${content}`,
    changed: true,
  }
}

function getBundledRelayTemplateDir() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../templates/relay-engine");
}

function getBundledSupportTemplateDir() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../templates/support");
}

function getComponentsRoot(frontendAbs) {
  if (fs.existsSync(path.join(frontendAbs, "src", "components"))) {
    return path.join(frontendAbs, "src", "components");
  }
  return path.join(frontendAbs, "components");
}

function copyDirectoryTemplate({
  sourceDir,
  destinationDir,
  overwrite = false,
  transformContent,
}) {
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    return { copied: [], skipped: [], missing: true };
  }

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  const copied = [];
  const skipped = [];

  fs.mkdirSync(destinationDir, { recursive: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const sourceFile = path.join(sourceDir, entry.name);
    const destFile = path.join(destinationDir, entry.name);

    if (fs.existsSync(destFile) && !overwrite) {
      skipped.push(destFile);
      continue;
    }

    let content = fs.readFileSync(sourceFile, "utf-8");
    if (transformContent) {
      content = transformContent(content);
    }
    fs.writeFileSync(destFile, content, "utf-8");
    copied.push(destFile);
  }

  return { copied, skipped, missing: false };
}

function ensureFileFromTemplate({
  sourceFile,
  targetFile,
  overwrite = false,
  transformContent,
}) {
  if (!fs.existsSync(sourceFile)) return { written: false, missing: true };
  if (fs.existsSync(targetFile) && !overwrite) return { written: false, missing: false };

  let content = fs.readFileSync(sourceFile, "utf-8");
  if (transformContent) content = transformContent(content);
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, content, "utf-8");
  return { written: true, missing: false };
}

function ensureTimelineEventType(frontendAbs) {
  const libDir = path.join(frontendAbs, "lib");
  const typesPath = path.join(libDir, "types.ts");
  const minimalTimelineType = `export interface TimelineEvent {\n  id: string\n  event: string\n  description: string\n  timestamp: string\n  isError?: boolean\n  properties?: Record<string, unknown>\n}\n`;

  if (!fs.existsSync(typesPath)) {
    fs.mkdirSync(libDir, { recursive: true });
    fs.writeFileSync(typesPath, minimalTimelineType, "utf-8");
    return { created: true, appended: false, path: typesPath };
  }

  const existing = fs.readFileSync(typesPath, "utf-8");
  if (existing.includes("interface TimelineEvent")) {
    return { created: false, appended: false, path: typesPath };
  }

  const sep = existing.endsWith("\n") ? "" : "\n";
  fs.writeFileSync(typesPath, `${existing}${sep}\n${minimalTimelineType}`, "utf-8");
  return { created: false, appended: true, path: typesPath };
}

function ensureFrontendDependencies(frontendAbs) {
  const packagePath = path.join(frontendAbs, "package.json");
  if (!fs.existsSync(packagePath)) {
    return { updated: false, missingPackageJson: true, added: [] };
  }

  const required = {
    "@ai-sdk/react": "^3.0.105",
    ai: "^6.0.103",
    "framer-motion": "^12.34.3",
    "posthog-js": "^1.356.1",
  };

  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
  const deps = pkg.dependencies || {};
  const added = [];
  for (const [name, version] of Object.entries(required)) {
    if (!deps[name]) {
      deps[name] = version;
      added.push(name);
    }
  }

  pkg.dependencies = Object.fromEntries(Object.entries(deps).sort(([a], [b]) => a.localeCompare(b)));

  if (added.length === 0) {
    return { updated: false, missingPackageJson: false, added: [], path: packagePath };
  }

  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
  return { updated: true, missingPackageJson: false, added, path: packagePath };
}

function detectTypeScriptProject(frontendAbs, cwd, options) {
  if (options.jsx !== undefined && isTruthy(options.jsx)) return false;
  if (options.tsx !== undefined && isTruthy(options.tsx)) return true;
  if (fs.existsSync(path.join(frontendAbs, "tsconfig.json"))) return true;
  if (fs.existsSync(path.join(cwd, "tsconfig.json"))) return true;

  function hasTypeScriptFiles(dir, depth = 4) {
    if (depth < 0) return false;
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".next", ".git", "dist", "build"].includes(entry.name)) continue;
        if (hasTypeScriptFiles(absolute, depth - 1)) return true;
        continue;
      }
      if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        return true;
      }
    }
    return false;
  }

  if (hasTypeScriptFiles(frontendAbs)) return true;
  return false;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function isNextJsFrontend(frontendAbs) {
  const packagePath = path.join(frontendAbs, "package.json");
  if (!fs.existsSync(packagePath)) {
    return {
      ok: false,
      reason: `Unsupported frontend: missing ${path.relative(frontendAbs, packagePath) || "package.json"}. AI FDE supports Next.js frontends only.`,
    };
  }

  let pkg;
  try {
    pkg = loadJson(packagePath);
  } catch {
    return {
      ok: false,
      reason: "Unsupported frontend: package.json is not valid JSON. AI FDE supports Next.js frontends only.",
    };
  }

  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  if (!deps.next) {
    return {
      ok: false,
      reason: "Unsupported frontend: `next` dependency not found in package.json. AI FDE supports Next.js frontends only.",
    };
  }

  return { ok: true, packagePath };
}

function detectFastApiFromFile(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  const content = fs.readFileSync(filePath, "utf-8");
  return content.includes("fastapi") || content.includes("FastAPI(");
}

function hasFastApiPythonFiles(rootDir, depth = 4) {
  if (depth < 0) return false;
  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) return false;

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if ([".git", "node_modules", ".venv", "venv", "__pycache__", ".pytest_cache"].includes(entry.name)) continue;
      if (hasFastApiPythonFiles(absolute, depth - 1)) return true;
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".py")) continue;
    if (detectFastApiFromFile(absolute)) return true;
  }
  return false;
}

function isFastApiBackend(backendAbs) {
  const pyproject = path.join(backendAbs, "pyproject.toml");
  if (detectFastApiFromFile(pyproject)) return { ok: true };

  const requirements = path.join(backendAbs, "requirements.txt");
  if (detectFastApiFromFile(requirements)) return { ok: true };

  const mainPy = path.join(backendAbs, "main.py");
  if (detectFastApiFromFile(mainPy)) return { ok: true };

  if (hasFastApiPythonFiles(backendAbs)) return { ok: true };

  return {
    ok: false,
    reason: "Unsupported backend: FastAPI not detected. AI FDE supports FastAPI backends only.",
  };
}

function runCodexLogPass({ targetDir, scope, project, apiBaseUrl }) {
  const check = spawnSync("codex", ["--version"], { encoding: "utf-8" });
  if (check.status !== 0) {
    return {
      attempted: false,
      success: false,
      reason: "Codex CLI is not available in PATH. Skipped LLM log instrumentation.",
    };
  }

  const prompt = [
    `Instrument ${scope} logging for AI FDE.`,
    "Constraints:",
    "- Do NOT change business logic or control flow.",
    "- Add logging only (non-breaking, minimal, defensive).",
    "- Reuse existing telemetry abstractions when present.",
    `- Include project metadata: ${project}.`,
    "- Include session ID and user ID in logged payloads when available.",
    `- Backend should stream logs in real time to ${apiBaseUrl}/ingest when possible.`,
    "- Keep changes scoped and idempotent.",
  ].join("\n");

  const run = spawnSync(
    "codex",
    [
      "exec",
      "--full-auto",
      "--skip-git-repo-check",
      "--cd",
      targetDir,
      prompt,
    ],
    { encoding: "utf-8" },
  );

  return {
    attempted: true,
    success: run.status === 0,
    status: run.status,
    stdout: run.stdout || "",
    stderr: run.stderr || "",
  };
}

function patchLayoutWithProvider(layoutFile, providerFile) {
  let content = fs.readFileSync(layoutFile, 'utf-8')
  let changed = false

  const importPath = toModuleImportPath(path.dirname(layoutFile), providerFile)
  const importLine = `import AIFDEProvider from '${importPath}'`
  const importResult = ensureImport(content, importLine)
  content = importResult.content
  changed = changed || importResult.changed

  const posthogPath = path.join(path.dirname(providerFile), "..", "posthog-provider.tsx")
  const posthogImportPath = toModuleImportPath(path.dirname(layoutFile), posthogPath)
  const posthogImportLine = `import { PostHogProvider } from '${posthogImportPath}'`
  const posthogImportResult = ensureImport(content, posthogImportLine)
  content = posthogImportResult.content
  changed = changed || posthogImportResult.changed

  if (!content.includes('<AIFDEProvider')) {
    const bodyOpen = /<body\b[^>]*>/
    const bodyOpenMatch = bodyOpen.exec(content)
    const bodyCloseIndex = content.lastIndexOf('</body>')

    if (bodyOpenMatch && bodyCloseIndex > bodyOpenMatch.index) {
      const openTagEnd = bodyOpenMatch.index + bodyOpenMatch[0].length
      content = `${content.slice(0, openTagEnd)}\n        <AIFDEProvider>${content.slice(openTagEnd, bodyCloseIndex)}\n        </AIFDEProvider>${content.slice(bodyCloseIndex)}`
      changed = true
    } else if (content.includes('{children}')) {
      content = content.replace('{children}', '<AIFDEProvider>{children}</AIFDEProvider>')
      changed = true
    }
  }

  if (!content.includes("<PostHogProvider>")) {
    const bodyOpen = /<body\b[^>]*>/
    const bodyOpenMatch = bodyOpen.exec(content)
    const bodyCloseIndex = content.lastIndexOf("</body>")
    if (bodyOpenMatch && bodyCloseIndex > bodyOpenMatch.index) {
      const openTagEnd = bodyOpenMatch.index + bodyOpenMatch[0].length
      content = `${content.slice(0, openTagEnd)}\n        <PostHogProvider>${content.slice(openTagEnd, bodyCloseIndex)}\n        </PostHogProvider>${content.slice(bodyCloseIndex)}`
      changed = true
    }
  }

  if (changed) {
    fs.writeFileSync(layoutFile, content, 'utf-8')
  }

  return { changed, target: layoutFile, mounted: content.includes('<AIFDEProvider') }
}

function patchMainWithProvider(mainFile, providerFile) {
  let content = fs.readFileSync(mainFile, 'utf-8')
  let changed = false

  const importPath = toModuleImportPath(path.dirname(mainFile), providerFile)
  const importLine = `import AIFDEProvider from '${importPath}'`
  const importResult = ensureImport(content, importLine)
  content = importResult.content
  changed = changed || importResult.changed

  const posthogPath = path.join(path.dirname(providerFile), "..", "posthog-provider.tsx")
  const posthogImportPath = toModuleImportPath(path.dirname(mainFile), posthogPath)
  const posthogImportLine = `import { PostHogProvider } from '${posthogImportPath}'`
  const posthogImportResult = ensureImport(content, posthogImportLine)
  content = posthogImportResult.content
  changed = changed || posthogImportResult.changed

  if (!content.includes('<AIFDEProvider>')) {
    const before = content
    content = content
      .replace(/<App\s*\/>/, '<PostHogProvider><AIFDEProvider><App /></AIFDEProvider></PostHogProvider>')
      .replace(/<App><\/App>/, '<PostHogProvider><AIFDEProvider><App /></AIFDEProvider></PostHogProvider>')
    if (content !== before) changed = true
  }

  if (changed) {
    fs.writeFileSync(mainFile, content, 'utf-8')
  }

  return { changed, target: mainFile, mounted: content.includes('<AIFDEProvider>') }
}

function ensureProvider(frontendAbs, useTypeScript, overwrite = false) {
  const componentsRoot = getComponentsRoot(frontendAbs)

  const ext = useTypeScript ? 'tsx' : 'jsx'
  const providerPath = path.join(componentsRoot, 'relay-engine', `provider.${ext}`)

  const source = useTypeScript
    ? `'use client'\n\nimport type { ReactNode } from 'react'\nimport RelayEngine from './relay-engine'\n\ninterface AIFDEProviderProps {\n  children: ReactNode\n}\n\nexport default function AIFDEProvider({ children }: AIFDEProviderProps) {\n  return (\n    <>\n      {children}\n      <RelayEngine />\n    </>\n  )\n}\n`
    : `'use client'\n\nimport RelayEngine from './relay-engine'\n\nexport default function AIFDEProvider({ children }) {\n  return (\n    <>\n      {children}\n      <RelayEngine />\n    </>\n  )\n}\n`

  if (fs.existsSync(providerPath) && !overwrite) {
    const existing = fs.readFileSync(providerPath, "utf-8")
    if (existing.includes("RelayLauncher") && !existing.includes("RelayEngine")) {
      fs.writeFileSync(providerPath, source, "utf-8")
      return { providerPath, written: true }
    }
    return { providerPath, written: false }
  }

  fs.mkdirSync(path.dirname(providerPath), { recursive: true })
  fs.writeFileSync(providerPath, source, 'utf-8')
  return { providerPath, written: true }
}

function mountProvider(frontendAbs, providerPath) {
  const layoutFile = findFirstExisting(frontendAbs, [
    'app/layout.tsx',
    'app/layout.jsx',
    'src/app/layout.tsx',
    'src/app/layout.jsx',
  ])

  if (layoutFile) {
    return patchLayoutWithProvider(layoutFile, providerPath)
  }

  const mainFile = findFirstExisting(frontendAbs, [
    'src/main.tsx',
    'src/main.jsx',
    'main.tsx',
    'main.jsx',
  ])

  if (mainFile) {
    return patchMainWithProvider(mainFile, providerPath)
  }

  return { changed: false, target: null, mounted: false }
}

async function shouldRunStep({ options, key, label, done, nonInteractive }) {
  const skipFlag = options[`skip-${key}`] !== undefined && isTruthy(options[`skip-${key}`])
  const rerunFlag = options[`rerun-${key}`] !== undefined && isTruthy(options[`rerun-${key}`])

  if (skipFlag) return false
  if (rerunFlag) return true

  if (nonInteractive) {
    return !done
  }

  if (done) {
    return promptConfirm({
      label: `${label} looks already done. Re-run this step?`,
      defaultValue: false,
    })
  }

  return promptConfirm({
    label: `${label}?`,
    defaultValue: true,
  })
}

export async function runCollisonInstall({ cwd, options = {}, logger }) {
  const nonInteractive = options.yes !== undefined && isTruthy(options.yes)
  const state = readState(cwd)
  const existingConfig = loadConfig(cwd)

  const defaultProject = existingConfig?.project || sanitizeProjectName(path.basename(cwd))
  const defaultFrontend = existingConfig?.frontendDir || detectFrontendDefault(cwd)
  const defaultBackend = existingConfig?.backendDir || detectBackendDefault(cwd)
  const defaultApi = existingConfig?.apiBaseUrl || DEFAULT_API_BASE_URL

  const project = sanitizeProjectName(
    options.project
      || (nonInteractive
        ? defaultProject
        : await promptText({ label: 'Project name', defaultValue: defaultProject })),
  )

  const frontendDir = options.frontend
    || (nonInteractive
      ? defaultFrontend
      : await promptText({ label: 'Frontend directory', defaultValue: defaultFrontend }))

  const backendDir = options.backend
    || (nonInteractive
      ? defaultBackend
      : await promptText({ label: 'Backend directory', defaultValue: defaultBackend }))

  const apiBaseUrl = stripTrailingSlash(
    options.api
      || (nonInteractive
        ? defaultApi
        : await promptText({ label: 'Relay API base URL', defaultValue: defaultApi })),
  )

  const frontendAbs = path.resolve(cwd, String(frontendDir))
  const backendAbs = path.resolve(cwd, String(backendDir))

  if (!isDirectory(frontendAbs)) {
    throw new Error(`Frontend directory does not exist: ${frontendDir}`)
  }

  if (!isDirectory(backendAbs)) {
    throw new Error(`Backend directory does not exist: ${backendDir}`)
  }

  const nextSupport = isNextJsFrontend(frontendAbs);
  if (!nextSupport.ok) {
    throw new Error(nextSupport.reason);
  }

  const fastApiSupport = isFastApiBackend(backendAbs);
  if (!fastApiSupport.ok) {
    throw new Error(fastApiSupport.reason);
  }

  const { config } = saveConfig(cwd, {
    project,
    frontendDir,
    backendDir,
    apiBaseUrl,
    frontendOutputDir: existingConfig?.frontendOutputDir,
    backendOutputDir: existingConfig?.backendOutputDir,
  })

  logger.success('Step 1/6 complete: project config saved.')

  const instrumentationDetection = detectInstrumentationDone(frontendAbs, backendAbs)
  const step2Done = instrumentationDetection.done || state.instrumented === true

  const runStep2 = await shouldRunStep({
    options,
    key: 'instrument',
    label: 'Step 2+3 add frontend/backend logs and CSS relay IDs',
    done: step2Done,
    nonInteractive,
  })

  let instrumentResult = null
  if (runStep2) {
    instrumentResult = runInstrument({
      cwd,
      options: {
        project: config.project,
        api: config.apiBaseUrl,
        frontend: config.frontendDir,
        backend: config.backendDir,
      },
      logger,
    })

    const skipCodexLogs = options["skip-codex-logs"] !== undefined && isTruthy(options["skip-codex-logs"]);
    if (!skipCodexLogs) {
      const frontendCodex = runCodexLogPass({
        targetDir: frontendAbs,
        scope: "frontend",
        project: config.project,
        apiBaseUrl: config.apiBaseUrl,
      });
      const backendCodex = runCodexLogPass({
        targetDir: backendAbs,
        scope: "backend",
        project: config.project,
        apiBaseUrl: config.apiBaseUrl,
      });

      instrumentResult.codexLogs = { frontend: frontendCodex, backend: backendCodex };

      if (!frontendCodex.success || !backendCodex.success) {
        logger.warn("Codex log pass did not fully complete. Core instrumentation still applied.");
      } else {
        logger.info("Codex CLI log pass completed for frontend and backend.");
      }
    } else {
      instrumentResult.codexLogs = { skipped: true };
      logger.info("Skipped Codex CLI log pass (--skip-codex-logs).");
    }

    state.instrumented = true
    state.instrumentedAt = new Date().toISOString()
    logger.success('Step 2/6 + 3/6 complete: instrumentation updated.')
  } else {
    logger.info('Skipped Step 2/6 + 3/6.')
  }

  const runStep4 = await shouldRunStep({
    options,
    key: 'upload',
    label: 'Step 4 upload frontend/backend code snapshot',
    done: Boolean(state.lastUploadAt),
    nonInteractive,
  })

  let uploadResult = null
  let uploadError = null
  if (runStep4) {
    try {
      uploadResult = await runUpload({
        cwd,
        options: {
          stagedOnly: false,
        },
        logger,
      })
      state.lastUploadAt = new Date().toISOString()
      state.lastUploadFiles = uploadResult?.stats?.totalCount || 0
      logger.success('Step 4/6 complete: upload attempted.')
    } catch (error) {
      uploadError = error instanceof Error ? error.message : String(error)
      logger.warn(`Step 4/6 upload failed: ${uploadError}`)
    }
  } else {
    logger.info('Skipped Step 4/6.')
  }

  const uiDetection = detectUiDone(frontendAbs)
  const runStep5 = await shouldRunStep({
    options,
    key: 'ui',
    label: 'Step 5 add floating panel and mount it through a provider',
    done: uiDetection.done || state.uiInstalled === true,
    nonInteractive,
  })

  let uiResult = null
  if (runStep5) {
    if (uiDetection.hasRelayEngine) {
      uiResult = {
        skipped: true,
        reason: 'Existing RelayEngine detected in root layout/entrypoint.',
      }
      state.uiInstalled = true
      state.uiInstalledAt = new Date().toISOString()
      state.uiInstallMode = 'existing-relay-engine'
      logger.info('Step 5/6 skipped: existing RelayEngine already mounted.')
      writeState(cwd, state)

      // Continue to step 6 prompts without generating duplicate UI wrappers.
    } else {
    const overwrite = options.overwrite !== undefined && isTruthy(options.overwrite)
    const useTypeScript = detectTypeScriptProject(frontendAbs, cwd, options)
    const componentsRoot = getComponentsRoot(frontendAbs)
    const relayEngineTargetDir = path.join(componentsRoot, "relay-engine")
    const relayTemplateSourceDir = getBundledRelayTemplateDir()
    const supportTemplateDir = getBundledSupportTemplateDir()

    const templateCopyResult = copyDirectoryTemplate({
      sourceDir: relayTemplateSourceDir,
      destinationDir: relayEngineTargetDir,
      overwrite,
      transformContent: (content) =>
        content.replace(/relay-engine 15-04-12-466/g, "relay-engine"),
    })

    let addResult = null
    if (templateCopyResult.missing) {
      // Fallback if the richer relay-engine template directory is unavailable.
      addResult = runAdd({
        cwd,
        options: {
          frontend: config.frontendDir,
          overwrite: options.overwrite,
          tsx: options.tsx,
          jsx: options.jsx,
        },
        components: ['launcher'],
        logger,
      })
    }

    const providerResult = ensureProvider(
      frontendAbs,
      addResult ? addResult.useTypeScript : useTypeScript,
      overwrite,
    )

    const posthogProviderTemplate = path.join(supportTemplateDir, "components", "posthog-provider.tsx")
    const posthogProviderTargetDir = path.join(componentsRoot, "posthog-provider.tsx")
    const posthogProviderResult = ensureFileFromTemplate({
      sourceFile: posthogProviderTemplate,
      targetFile: posthogProviderTargetDir,
      overwrite,
    })

    const posthogLibResult = ensureFileFromTemplate({
      sourceFile: path.join(supportTemplateDir, "lib", "posthog.ts"),
      targetFile: path.join(frontendAbs, "lib", "posthog.ts"),
      overwrite,
    })

    const relayCollectorLibResult = ensureFileFromTemplate({
      sourceFile: path.join(supportTemplateDir, "lib", "relay-collector.ts"),
      targetFile: path.join(frontendAbs, "lib", "relay-collector.ts"),
      overwrite,
    })

    const timelineTypeResult = ensureTimelineEventType(frontendAbs)
    const dependencyResult = ensureFrontendDependencies(frontendAbs)

    const mountResult = mountProvider(frontendAbs, providerResult.providerPath)

    uiResult = {
      addResult,
      templateSourceDir: templateCopyResult.missing ? null : path.relative(cwd, relayTemplateSourceDir),
      templateCopiedFiles: templateCopyResult.copied.map((filePath) => path.relative(cwd, filePath)),
      templateSkippedFiles: templateCopyResult.skipped.map((filePath) => path.relative(cwd, filePath)),
      providerPath: path.relative(cwd, providerResult.providerPath),
      providerWritten: providerResult.written,
      posthogProviderPath: path.relative(cwd, posthogProviderTargetDir),
      posthogProviderWritten: posthogProviderResult.written,
      posthogLibPath: path.relative(cwd, path.join(frontendAbs, "lib", "posthog.ts")),
      posthogLibWritten: posthogLibResult.written,
      relayCollectorLibPath: path.relative(cwd, path.join(frontendAbs, "lib", "relay-collector.ts")),
      relayCollectorLibWritten: relayCollectorLibResult.written,
      timelineTypePath: path.relative(cwd, timelineTypeResult.path),
      timelineTypeCreated: timelineTypeResult.created,
      timelineTypeAppended: timelineTypeResult.appended,
      dependenciesUpdated: dependencyResult.updated,
      dependenciesAdded: dependencyResult.added,
      missingFrontendPackageJson: dependencyResult.missingPackageJson,
      mountTarget: mountResult.target ? path.relative(cwd, mountResult.target) : null,
      mountPatched: mountResult.changed,
      mounted: mountResult.mounted,
    }

    state.uiInstalled = true
    state.uiInstalledAt = new Date().toISOString()

    if (!mountResult.mounted) {
      logger.warn('Provider was created, but automatic mount could not be confirmed. Manual mount may be required.')
    }

    logger.success('Step 5/6 complete: UI files/provider step processed.')
    }
  } else {
    logger.info('Skipped Step 5/6.')
  }

  let tested = false
  let deployed = false
  if (nonInteractive) {
    logger.info('Step 6/6 pending: run app, verify UI, then deploy frontend and backend changes.')
    logger.info(`Add frontend env file: ${path.join(config.frontendDir, ".env.local")}`);
    logger.info("Required frontend vars: NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_FDE_URL. Optional: NEXT_PUBLIC_POSTHOG_HOST.");
    logger.info(`Add backend env file: ${path.join(config.backendDir, ".env")}`);
    logger.info("Required backend vars depend on your FastAPI app; include keys needed for relay ingestion and model/runtime secrets.");
  } else {
    tested = await promptConfirm({
      label: 'Step 6 run the app now. Is the floating panel visible?',
      defaultValue: false,
    })

    deployed = await promptConfirm({
      label: 'Did you deploy frontend and backend changes?',
      defaultValue: false,
    })

    if (tested) state.lastUiTestedAt = new Date().toISOString()
    if (deployed) state.lastDeployedAt = new Date().toISOString()

    if (!tested) {
      logger.warn('Please test locally before shipping: confirm panel + chat render, and logs stream from frontend/backend.')
    }
    if (!deployed) {
      logger.warn('Please deploy both frontend and backend after validation.')
    }
    logger.info(`Frontend env file: ${path.join(config.frontendDir, ".env.local")} (NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_FDE_URL, optional NEXT_PUBLIC_POSTHOG_HOST).`);
    logger.info(`Backend env file: ${path.join(config.backendDir, ".env")} (FastAPI service secrets/runtime vars).`);
  }

  writeState(cwd, state)

  return {
    config,
    instrumentResult,
    uploadResult,
    uploadError,
    uiResult,
    tested,
    deployed,
  }
}
