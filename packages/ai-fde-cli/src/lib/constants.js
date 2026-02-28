export const CONFIG_DIR = '.ai-fde'
export const CONFIG_PATH = '.ai-fde/config.json'
export const STATE_PATH = '.ai-fde/state.json'
export const HOOKS_DIR = '.githooks'
export const PRE_COMMIT_PATH = '.githooks/pre-commit'

export const DEFAULT_API_BASE_URL = 'https://relay-engine-production.up.railway.app'
export const DEFAULT_BACKEND_OUTPUT_DIR = 'backend'
export const DEFAULT_FRONTEND_OUTPUT_DIR = 'frontend'

export const DEFAULT_EXCLUDE_DIRS = new Set([
  '.git',
  '.hg',
  '.svn',
  '.next',
  '.ai-fde',
  '.githooks',
  '.turbo',
  '.cache',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'out',
  'tmp',
  'data',
  '__pycache__',
  '.pytest_cache',
  '.venv',
  'venv',
])

export const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  '.py',
  '.go',
  '.java',
  '.kt',
  '.rb',
  '.php',
  '.cs',
  '.swift',
  '.rs',
  '.html',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.json',
  '.yml',
  '.yaml',
  '.toml',
  '.ini',
  '.graphql',
  '.gql',
  '.md',
  '.txt',
  '.sql',
  '.sh',
  '.bash',
  '.zsh',
])

export const ALLOWED_FILENAMES = new Set([
  'dockerfile',
  'makefile',
  'procfile',
  '.gitignore',
  '.dockerignore',
  '.npmrc',
  '.nvmrc',
  '.prettierrc',
  '.eslintrc',
])

export const MAX_FILE_BYTES = 250_000
export const MAX_FILES_PER_CHUNK = 100
export const MAX_CHUNK_BYTES = 900_000
