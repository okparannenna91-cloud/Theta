import { mkdir, writeFile } from 'fs/promises'
import { resolve } from 'path'
import type { BrowserConfig } from './browser-config'

export interface LogEntry {
  execution_id: string
  task: string
  duration_ms: number
  browser_status: string
  model: string
  token_usage: { prompt?: number; completion?: number; total?: number } | null
  result: string
  errors: string[]
  timestamp: string
}

export interface ReportScore {
  usability: number
  reliability: number
  performance: number
  productivity: number
  overall: number
}

export interface QaReport {
  title: string
  timestamp: string
  duration_seconds: number
  scores: ReportScore
  tests: Array<{
    name: string
    success: boolean
    steps?: number
    result?: string | null
    error?: string
  }>
  screenshots: string[]
  model: string
}

export function generateMarkdownReport(report: QaReport): string {
  const lines: string[] = [
    `# ${report.title}`,
    '',
    `**Date:** ${report.timestamp}`,
    `**Duration:** ${report.duration_seconds}s`,
    `**Model:** ${report.model}`,
    '',
    '## Scores',
    '',
    '| Metric | Score |',
    '|--------|-------|',
    `| Usability | ${report.scores.usability}/10 |`,
    `| Reliability | ${report.scores.reliability}/10 |`,
    `| Performance | ${report.scores.performance}/10 |`,
    `| Productivity | ${report.scores.productivity}/10 |`,
    `| **Overall** | **${report.scores.overall}/10** |`,
    '',
    '## Test Results',
    '',
    '| Test | Status | Steps | Result |',
    '|------|--------|-------|--------|',
  ]

  for (const test of report.tests) {
    const status = test.success ? '[PASS]' : '[FAIL]'
    const result = test.result ?? test.error ?? '-'
    lines.push(`| ${test.name} | ${status} | ${test.steps ?? '-'} | ${result} |`)
  }

  lines.push('', '## Screenshots', '')
  if (report.screenshots.length > 0) {
    for (const s of report.screenshots) {
      lines.push(`- ${s}`)
    }
  } else {
    lines.push('No screenshots captured.')
  }

  return lines.join('\n')
}

export function generateJsonReport(report: QaReport): string {
  return JSON.stringify(report, null, 2)
}

export async function saveMarkdownReport(
  config: BrowserConfig,
  report: QaReport,
): Promise<string> {
  const fileName = `report-${report.timestamp.replace(/[:.]/g, '-')}.md`
  const filePath = resolve(config.reportDir, fileName)
  await mkdir(config.reportDir, { recursive: true })
  await writeFile(filePath, generateMarkdownReport(report), 'utf-8')
  return filePath
}

export async function saveJsonReport(
  config: BrowserConfig,
  report: QaReport,
): Promise<string> {
  const fileName = `report-${report.timestamp.replace(/[:.]/g, '-')}.json`
  const filePath = resolve(config.reportDir, fileName)
  await mkdir(config.reportDir, { recursive: true })
  await writeFile(filePath, generateJsonReport(report), 'utf-8')
  return filePath
}

export async function writeLog(
  config: BrowserConfig,
  executionId: string,
  entry: LogEntry,
): Promise<string> {
  const fileName = `log-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`
  const filePath = resolve(config.logDir, fileName)
  await mkdir(config.logDir, { recursive: true })
  await writeFile(filePath, JSON.stringify(entry) + '\n', { flag: 'a', encoding: 'utf-8' })
  return filePath
}
