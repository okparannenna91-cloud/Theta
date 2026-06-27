import { runBrowserTask, type ExecuteResult } from './browser-runner'

export async function testTheta(): Promise<ExecuteResult> {
  return runBrowserTask(
    `Navigate to the Theta application at the local development URL.
     Test the following features:
     1. Open the homepage and verify it loads
     2. Navigate to /sign-in and verify the sign-in page renders
     3. Check that the UI elements are properly displayed
     Take screenshots of each page.`,
  )
}

export async function researchLinkedInLead(
  companyName: string,
): Promise<ExecuteResult> {
  return runBrowserTask(
    `Research the company "${companyName}" on LinkedIn.
     Navigate to LinkedIn and search for the company.
     Open the company page.
     Analyze:
     - Company size and industry
     - Recent posts and activity
     - Key employees and roles
     Take screenshots of the company page.`,
  )
}

export async function openWebsite(url: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `Navigate to ${url}.
     Wait for the page to fully load.
     Take a screenshot of the page.
     Extract the main content and page title.`,
  )
}

export async function login(
  url: string,
  username: string,
  password: string,
): Promise<ExecuteResult> {
  return runBrowserTask(
    `Navigate to ${url}.
     Enter the username "${username}" in the username/email field.
     Enter the password "${password}" in the password field.
     Click the login/submit button.
     Wait for the dashboard or post-login page to load.
     Take a screenshot of the result.`,
  )
}

export async function click(selector: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `On the current page, find and click the element matching selector "${selector}".
     Wait for any navigation or dynamic content to load after clicking.
     Take a screenshot of the result.`,
  )
}

export async function typeText(
  selector: string,
  text: string,
): Promise<ExecuteResult> {
  return runBrowserTask(
    `On the current page, find the element matching selector "${selector}".
     Clear any existing text in the field.
     Type the text "${text}" into the field.
     Take a screenshot to confirm.`,
  )
}

export async function wait(durationMs: number): Promise<ExecuteResult> {
  return runBrowserTask(
    `Wait for ${durationMs} milliseconds on the current page.
     After waiting, take a screenshot of the page.`,
  )
}

export async function screenshot(): Promise<ExecuteResult> {
  return runBrowserTask(
    `Take a screenshot of the current page.
     Ensure the full page is captured if possible.`,
  )
}

export async function extractText(): Promise<ExecuteResult> {
  return runBrowserTask(
    `Extract all visible text content from the current page.
     Return the text content as the result.`,
  )
}

export async function downloadReport(url: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `Navigate to ${url}.
     Find any download links, export buttons, or report generation options.
     If found, click to download the report.
     Take screenshots throughout the process.`,
  )
}

export async function closeBrowser(): Promise<ExecuteResult> {
  return runBrowserTask(
    `Close all browser tabs and cleanly shut down the browser.`,
  )
}
