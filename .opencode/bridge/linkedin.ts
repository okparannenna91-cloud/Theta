import { runBrowserTask, type ExecuteResult } from './browser-runner'

export interface OutreachProfile {
  companyName: string
  companyWebsite?: string
  targetRole?: string
  targetName?: string
}

export async function researchCompany(companyName: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `Research the company "${companyName}".
     Search the web for:
     1. Company overview and description
     2. Company size, location, and industry
     3. Recent news, funding, or achievements
     4. Key products or services
     5. Company culture and values
     Compile a comprehensive company profile.
     Take screenshots of the research results.`,
  )
}

export async function openLinkedIn(): Promise<ExecuteResult> {
  return runBrowserTask(
    `Navigate to https://www.linkedin.com.
     Wait for the page to load.
     Check if we are on the LinkedIn homepage or login page.
     Take a screenshot of the current LinkedIn page.
     Report whether we are logged in or need to authenticate.`,
  )
}

export async function openCompanyWebsite(website: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `Navigate to ${website}.
     Wait for the page to fully load.
     Analyze the company website:
     1. Identify the main value proposition
     2. Note the design and professionalism
     3. Find the About/Company page
     4. Note key products and services
     Take screenshots of the homepage and about page.
     Compile a summary of findings.`,
  )
}

export async function analyzeCompany(companyName: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `Analyze the company "${companyName}" for Theta project management software fit.
     Research:
     1. What industry is the company in?
     2. Approximate company size (startup, SMB, enterprise)?
     3. Do they likely use project management software?
     4. What are their key pain points in project management?
     5. Would Theta's features (task management, AI assistant, collaboration) benefit them?
     Provide a detailed analysis of Theta fit for this company.`,
  )
}

export async function analyzeRole(role: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `Analyze the role of "${role}" in the context of project management software sales.
     Understand:
     1. What are the responsibilities of this role?
     2. What project management challenges does this role face?
     3. How would Theta's features benefit someone in this role?
     4. What messaging would resonate with this role?
     5. What objections might they have?
     Provide a detailed role analysis for personalized outreach.`,
  )
}

export async function determineThetaFit(
  companyName: string,
  website: string,
): Promise<ExecuteResult> {
  return runBrowserTask(
    `Evaluate whether "${companyName}" (website: ${website}) is a good fit for Theta.
     Analyze:
     1. Company size and structure
     2. Industry and typical project management needs
     3. Likelihood of needing a project management tool
     4. Budget fit (based on company size and industry)
     5. Competitive landscape awareness
     Provide a fit score (1-10) and justification.
     Take screenshots of your research sources.`,
  )
}

export async function generateOutreach(
  profile: OutreachProfile,
): Promise<ExecuteResult> {
  return runBrowserTask(
    `Generate a personalized outreach message for ${profile.targetName ?? 'the lead'} at ${profile.companyName}.
     Context:
     - Company: ${profile.companyName}
     - Website: ${profile.companyWebsite ?? 'Not specified'}
     - Target Role: ${profile.targetRole ?? 'Not specified'}
     - Target Name: ${profile.targetName ?? 'Not specified'}

     The outreach message should:
     1. Be personalized to the company and role
     2. Reference something specific about their company or work
     3. Explain how Theta (a project management platform) can help
     4. Be concise and professional
     5. End with a soft call to action
     6. NOT be salesy or pushy

     Return the generated message as the result.
     Wait for user approval before suggesting to send.`,
  )
}

export async function fullOutreachWorkflow(
  profile: OutreachProfile,
): Promise<ExecuteResult> {
  return runBrowserTask(
    `Execute a full LinkedIn outreach research workflow for ${profile.companyName}.

     Phase 1 - Research:
     1. Research the company "${profile.companyName}" online
     2. If website provided (${profile.companyWebsite ?? 'N/A'}), analyze the company website
     3. Research the role "${profile.targetRole ?? 'Unknown'}" and their needs
     4. Determine Theta fit for this company

     Phase 2 - LinkedIn:
     1. Go to LinkedIn (https://www.linkedin.com)
     2. Search for the company on LinkedIn
     3. Look for ${profile.targetName ?? 'relevant contacts'} at the company
     4. Analyze their LinkedIn presence

     Phase 3 - Outreach:
     1. Generate a personalized outreach message
     2. Present the message for human review
     3. DO NOT SEND the message automatically
     4. Report the message and wait for approval

     Phase 4 - Summary:
     Provide a complete summary of findings including:
     - Company overview
     - Theta fit assessment
     - Generated outreach message
     - Screenshots at each stage

     IMPORTANT: Never send connection requests or messages automatically.
     Always wait for human approval.`,
  )
}
