import { randomUUID } from 'crypto'
import { spawn } from 'child_process'
import { resolve } from 'path'
import { loadConfig, type BrowserConfig, buildOpenRouterEnv } from './browser-config'
import { type LogEntry, writeLog } from './reports'

export interface ExecuteRequest {
  action: 'execute' | 'test_suite'
  task?: string
  tests?: Array<{ name: string; task: string }>
  config?: Record<string, unknown>
}

export interface ExecuteResult {
  success: boolean
  execution_id: string
  task?: string
  duration_seconds: number
  model?: string
  steps?: number
  result?: string | null
  errors?: string[]
  screenshots?: string[]
  results?: Array<{ name: string; success: boolean; steps?: number; result?: string | null; error?: string }>
  timestamp: string
  error?: { code: string; message: string; details?: string | null }
}

export interface RunnerOptions {
  taskTimeoutMs?: number
  onLog?: (entry: LogEntry) => void
}

function buildLogEntry(
  executionId: string,
  task: string,
  durationMs: number,
  result: ExecuteResult,
): LogEntry {
  return {
    execution_id: executionId,
    task,
    duration_ms: durationMs,
    browser_status: result.success ? 'completed' : 'failed',
    model: result.model ?? 'unknown',
    token_usage: null,
    result: result.success ? 'success' : 'error',
    errors: result.error ? [result.error.message] : (result.errors ?? []),
    timestamp: new Date().toISOString(),
  }
}

export async function runBrowserTask(
  task: string,
  options?: RunnerOptions,
): Promise<ExecuteResult> {
  const config = loadConfig()
  const executionId = randomUUID()
  const startTime = Date.now()

  const request: ExecuteRequest = {
    action: 'execute',
    task,
    config: {
      headless: config.headless,
      max_steps: 100,
    },
  }

  const result = await spawnPython(config, request, options?.taskTimeoutMs ?? 300000)

  if (options?.onLog) {
    const logEntry = buildLogEntry(executionId, task, Date.now() - startTime, result)
    options.onLog(logEntry)
  }

  await writeLog(config, executionId, {
    ...buildLogEntry(executionId, task, Date.now() - startTime, result),
  })

  return result
}

export async function runTestSuite(
  tests: Array<{ name: string; task: string }>,
  options?: RunnerOptions,
): Promise<ExecuteResult> {
  const config = loadConfig()
  const executionId = randomUUID()
  const startTime = Date.now()

  const request: ExecuteRequest = {
    action: 'test_suite',
    tests,
    config: {
      headless: config.headless,
      max_steps: 50,
    },
  }

  const result = await spawnPython(config, request, options?.taskTimeoutMs ?? 600000)

  if (options?.onLog) {
    const logEntry = buildLogEntry(executionId, `test_suite (${tests.length} tests)`, Date.now() - startTime, result)
    options.onLog(logEntry)
  }

  await writeLog(config, executionId, {
    ...buildLogEntry(executionId, `test_suite (${tests.length} tests)`, Date.now() - startTime, result),
  })

  return result
}

function spawnPython(
  config: BrowserConfig,
  request: ExecuteRequest,
  timeoutMs: number,
): Promise<ExecuteResult> {
  return new Promise((resolvePromise, reject) => {
    const runnerScript = resolve(__dirname, 'python', 'runner.py')
    const env = {
      ...process.env,
      ...buildOpenRouterEnv(config),
      HEADLESS: String(config.headless),
      PYTHONIOENCODING: 'utf-8',
    }
    if (config.chromeExecutable) {
      env.CHROME_EXECUTABLE = config.chromeExecutable
    }

    const child = spawn(config.pythonExecutable, [runnerScript], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })

    const timeout = setTimeout(() => {
      child.kill()
      resolvePromise({
        success: false,
        execution_id: 'timeout',
        duration_seconds: timeoutMs / 1000,
        timestamp: new Date().toISOString(),
        error: { code: 'TIMEOUT', message: `Task timed out after ${timeoutMs}ms` },
      })
    }, timeoutMs)

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      clearTimeout(timeout)

      if (code !== 0 && !stdout.trim()) {
        resolvePromise({
          success: false,
          execution_id: 'error',
          duration_seconds: (Date.now() - (startTime ?? Date.now())) / 1000,
          timestamp: new Date().toISOString(),
          error: {
            code: 'PROCESS_ERROR',
            message: `Process exited with code ${code}`,
            details: stderr.slice(0, 2000),
          },
        })
        return
      }

      try {
        const lines = stdout.trim().split('\n')
        const lastLine = lines[lines.length - 1]
        const result: ExecuteResult = JSON.parse(lastLine)
        resolvePromise(result)
      } catch {
        resolvePromise({
          success: false,
          execution_id: 'error',
          duration_seconds: (Date.now() - (startTime ?? Date.now())) / 1000,
          timestamp: new Date().toISOString(),
          error: {
            code: 'PARSE_ERROR',
            message: 'Failed to parse Python output as JSON',
            details: stdout.slice(0, 2000),
          },
        })
      }
    })

    child.on('error', (err) => {
      clearTimeout(timeout)
      resolvePromise({
        success: false,
        execution_id: 'error',
        duration_seconds: 0,
        timestamp: new Date().toISOString(),
        error: { code: 'SPAWN_ERROR', message: err.message },
      })
    })

    const startTime = Date.now()
    child.stdin.write(JSON.stringify(request) + '\n')
    child.stdin.end()
  })
}
