import { resolve } from 'path'

export interface BrowserConfig {
  browserUsePath: string
  pythonExecutable: string
  chromeExecutable: string | undefined
  headless: boolean
  screenshotDir: string
  reportDir: string
  logDir: string
  openRouter: OpenRouterConfig
}

export interface OpenRouterConfig {
  apiKey: string | undefined
  baseUrl: string
  model: string
}

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

function envOptional(key: string): string | undefined {
  return process.env[key] || undefined
}

function envBool(key: string, fallback: boolean): boolean {
  const val = process.env[key]
  if (val === undefined) return fallback
  return val.toLowerCase() === 'true' || val === '1'
}

export function loadConfig(): BrowserConfig {
  const browserUsePath = env('BROWSER_USE_PATH', resolve(process.cwd(), '..', 'browser-use'))
  const pythonExecutable = resolve(browserUsePath, '.venv', 'Scripts', 'python.exe')

  return {
    browserUsePath,
    pythonExecutable,
    chromeExecutable: envOptional('CHROME_EXECUTABLE'),
    headless: envBool('HEADLESS', false),
    screenshotDir: env(
      'SCREENSHOT_DIR',
      resolve(process.cwd(), '.opencode', 'bridge', 'screenshots')
    ),
    reportDir: env(
      'REPORT_DIR',
      resolve(process.cwd(), '.opencode', 'bridge', 'reports')
    ),
    logDir: env(
      'LOG_DIR',
      resolve(process.cwd(), '.opencode', 'bridge', 'logs')
    ),
    openRouter: {
      apiKey: envOptional('OPENROUTER_API_KEY'),
      baseUrl: env('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
      model: env('OPENROUTER_MODEL', 'google/gemini-2.5-flash-preview-04-17'),
    },
  }
}

export function buildOpenRouterEnv(config: BrowserConfig): Record<string, string> {
  const envVars: Record<string, string> = {
    OPENROUTER_BASE_URL: config.openRouter.baseUrl,
    OPENROUTER_MODEL: config.openRouter.model,
  }
  if (config.openRouter.apiKey) {
    envVars.OPENROUTER_API_KEY = config.openRouter.apiKey
  }
  return envVars
}
