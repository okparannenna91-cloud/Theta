import { runTestSuite, runBrowserTask, type ExecuteResult } from './browser-runner'
import { loadConfig } from './browser-config'
import {
  type QaReport,
  type ReportScore,
  saveMarkdownReport,
  saveJsonReport,
} from './reports'

interface QaOptions {
  baseUrl?: string
  headless?: boolean
}

const defaultTests = [
  {
    name: 'Authentication',
    task: `Navigate to {baseUrl}/sign-in.
     Verify the sign-in page loads correctly with email and password fields.
     Check that the sign-in button is visible and enabled.
     Take a screenshot of the sign-in page.`,
  },
  {
    name: 'Workspace Creation',
    task: `Navigate to {baseUrl}/dashboard.
     Look for a "Create Workspace" or "New Workspace" button or link.
     If found, click it and verify the workspace creation form appears.
     Take a screenshot of the workspace creation flow.`,
  },
  {
    name: 'Project Creation',
    task: `Navigate to {baseUrl}/dashboard.
     Look for project creation functionality.
     Verify the project creation UI is accessible.
     Take a screenshot of the project creation page.`,
  },
  {
    name: 'Task Creation',
    task: `Navigate to {baseUrl}/dashboard.
     Look for task creation functionality.
     Verify the task creation form is accessible.
     Take a screenshot of the task creation UI.`,
  },
  {
    name: 'Nova',
    task: `Navigate to {baseUrl}/dashboard.
     Look for any feature named "Nova" or any AI assistant feature.
     If found, interact with it and take a screenshot.
     If not found, report that Nova was not found on the page.`,
  },
  {
    name: 'Navigation',
    task: `Navigate to {baseUrl}/dashboard.
     Explore the sidebar or main navigation menu.
     Click through the available navigation items.
     Verify each page loads correctly.
     Take screenshots of the navigation flow.`,
  },
  {
    name: 'Billing',
    task: `Navigate to {baseUrl}/dashboard.
     Look for billing, pricing, or subscription pages.
     If found, navigate to the billing page and take a screenshot.
     Verify the billing/pricing information is displayed.`,
  },
  {
    name: 'Settings',
    task: `Navigate to {baseUrl}/dashboard.
     Look for settings or configuration pages.
     If found, navigate to settings and take a screenshot.
     Verify settings page loads correctly.`,
  },
]

function calculateScores(results: ExecuteResult): ReportScore {
  const tests = results.results ?? []
  const passed = tests.filter((t) => t.success).length
  const total = tests.length || 1
  const passRate = passed / total

  const avgSteps =
    tests.filter((t) => t.steps).reduce((sum, t) => sum + (t.steps ?? 0), 0) /
    Math.max(tests.filter((t) => t.steps).length, 1)

  return {
    usability: Math.round(passRate * 10 * 10) / 10,
    reliability: Math.round(Math.min(1, passRate + 0.1) * 10 * 10) / 10,
    performance: Math.round(Math.max(0, Math.min(10, 10 - avgSteps * 0.3)) * 10) / 10,
    productivity: Math.round(passRate * 10 * 10) / 10,
    overall: Math.round(
      ((passRate * 10 + Math.min(10, passRate * 10 + 1) + Math.max(0, 10 - avgSteps * 0.3) + passRate * 10) / 4) * 10,
    ) / 10,
  }
}

export async function runQaTests(options?: QaOptions): Promise<QaReport> {
  const baseUrl = options?.baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const tests = defaultTests.map((t) => ({
    ...t,
    task: t.task.replace(/\{baseUrl\}/g, baseUrl),
  }))

  const result = await runTestSuite(tests, {
    taskTimeoutMs: 600000,
  })

  const timestamp = new Date().toISOString()
  const screenshots = result.screenshots ?? []
  const scores = calculateScores(result)

  const report: QaReport = {
    title: 'Theta QA Test Report',
    timestamp,
    duration_seconds: result.duration_seconds,
    scores,
    tests: result.results ?? tests.map((t) => ({ name: t.name, success: false, error: 'No results returned' })),
    screenshots,
    model: result.model ?? 'unknown',
  }

  const config = loadConfig()
  const mdPath = await saveMarkdownReport(config, report)
  const jsonPath = await saveJsonReport(config, report)

  console.log(`QA report saved: ${mdPath}`)
  console.log(`QA JSON saved: ${jsonPath}`)

  return report
}

export async function testAuthentication(baseUrl: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `Navigate to ${baseUrl}/sign-in.
     Verify the sign-in page loads correctly.
     Check for email/username input field.
     Check for password input field.
     Check for sign-in/submit button.
     Take a screenshot of the sign-in page.
     Also check if there are options for social login (Google, GitHub, etc.).
     Report what authentication methods are available.`,
  )
}

export async function testWorkspaceCreation(baseUrl: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `Navigate to ${baseUrl}/dashboard.
     Find and click "Create Workspace" or "New Workspace" button.
     Fill in workspace name and details if possible.
     Take screenshots throughout the process.
     Report whether workspace creation was successful.`,
  )
}

export async function testProjectCreation(baseUrl: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `Navigate to ${baseUrl}/dashboard.
     Find project creation functionality.
     Create a new project if possible.
     Take screenshots throughout the process.
     Report whether project creation was successful.`,
  )
}

export async function testTaskCreation(baseUrl: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `Navigate to ${baseUrl}/dashboard.
     Find task creation functionality.
     Create a new task if possible.
     Take screenshots throughout the process.
     Report whether task creation was successful.`,
  )
}

export async function testNova(baseUrl: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `Navigate to ${baseUrl}/dashboard.
     Look for "Nova" or any AI assistant feature.
     If found, interact with the AI assistant.
     Ask a simple question to test the AI functionality.
     Take screenshots of the interaction.
     Report whether Nova is working.`,
  )
}

export async function testNavigation(baseUrl: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `Navigate to ${baseUrl}/dashboard.
     Explore the navigation sidebar or menu.
     Click through each main navigation item.
     Verify each section loads correctly.
     Take screenshots of each section.
     Report any broken navigation.`,
  )
}

export async function testBilling(baseUrl: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `Navigate to ${baseUrl}/dashboard.
     Look for billing, pricing, or subscription sections.
     Navigate to the billing page.
     Take a screenshot of the billing/pricing page.
     Report the pricing plans and features available.`,
  )
}

export async function testSettings(baseUrl: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `Navigate to ${baseUrl}/dashboard.
     Look for settings or profile configuration pages.
     Navigate to the settings page.
     Take a screenshot of the settings page.
     Report what settings are available.`,
  )
}
