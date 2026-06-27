import { readFile, writeFile, mkdir, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve } from 'path'
import {
  runBrowserTask,
  researchCompany,
  openCompanyWebsite,
  analyzeCompany,
  analyzeRole,
  determineThetaFit,
  generateOutreach,
  type ExecuteResult,
} from '../../bridge/browser'

const LINKEDIN_ROOT = resolve(process.cwd(), 'LinkedIn')

export interface Lead {
  name: string
  role: string
  company: string
  companyWebsite: string
  linkedinUrl: string
  industry: string
  companySize: string
  publicSignals: string[]
  thetaFitAnalysis: string
  confidenceScore: number
  suggestedFirstMessage: string
  suggestedFollowUp: string
  status: 'new' | 'researched' | 'qualified' | 'contacted' | 'rejected' | 'converted'
  createdAt: string
  updatedAt: string
}

export interface LeadCategory {
  name: string
  directory: string
  description: string
}

const CATEGORIES: LeadCategory[] = [
  { name: 'startup-founders', directory: 'startup-founders', description: 'Founders and CEOs of startups' },
  { name: 'agency-owners', directory: 'agency-owners', description: 'Agency owners and directors' },
  { name: 'project-managers', directory: 'project-managers', description: 'Project and product managers' },
  { name: 'operations', directory: 'operations', description: 'Operations and COO roles' },
]

export async function getThetaInfo(): Promise<string> {
  try {
    const pkg = JSON.parse(await readFile(resolve(process.cwd(), 'package.json'), 'utf-8'))
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    return [
      `Theta v${pkg.version ?? '1.0.0'}`,
      `Application URL: ${appUrl}`,
      `Description: ${pkg.description ?? 'Project management platform'}`,
      '',
      'Key capabilities (from codebase):',
      '- Project management with workspaces and projects',
      '- Task creation and management',
      '- AI assistant (Nova) for intelligent task assistance',
      '- Team collaboration features',
      '- Real-time updates with Ably',
      '- Dashboard with analytics',
      '- User authentication via Clerk',
      '- Billing and subscription management',
      '- Integration with GitHub, Bitbucket, Asana, Trello',
    ].join('\n')
  } catch {
    return 'Theta: Project management platform. Check package.json for details.'
  }
}

export async function reviewTheta(): Promise<string> {
  const info = await getThetaInfo()
  return `## Theta Review\n\n${info}\n\nAlways reference these capabilities when analyzing fit for potential leads.`
}

export async function discoverLeads(industry: string): Promise<ExecuteResult> {
  return runBrowserTask(
    `Research and discover potential leads for Theta in the "${industry}" industry.

     Look for:
     1. Companies in the ${industry} space that are growing or hiring
     2. Key decision makers (Founders, CEOs, CTOs, PMs)
     3. Companies with multiple teams or projects
     4. Remote-first or distributed teams
     5. Companies showing operational or collaboration challenges

     For each lead found, capture:
     - Company name
     - Person name and role
     - Why they might need project management
     - Theta fit reasoning

     Prioritize quality over quantity.
     Only include leads where Theta is clearly relevant.
     Take screenshots of research sources.

     Return a JSON array of leads found.`,
  )
}

export async function researchLead(
  companyName: string,
  personName?: string,
  role?: string,
): Promise<ExecuteResult> {
  const result = await runBrowserTask(
    `Deep research the company "${companyName}"${personName ? ` and person "${personName}"` : ''}${role ? ` in role "${role}"` : ''}.

     Research Plan:

     1. Company Research:
        - What does ${companyName} do? (products, services, industry)
        - Company size and structure
        - Team setup (remote, hybrid, in-office)
        - Current tools and workflows
        - Recent news, funding, growth signals
        - Hiring activity and team expansion

     2. Person Research${personName ? ` (${personName})` : ''}:
        - Role and responsibilities
        - Decision-making authority
        - Their team size and structure
        - Professional background
        - Any public posts or content

     3. Theta Fit Assessment:
        - Does this company manage multiple projects?
        - Do they have teams that need coordination?
        - Would Theta's features help them?
        - Are they the right size for Theta?

     Take screenshots of all sources.
     Provide a structured analysis.`,
  )

  if (result.success) {
    const lead: Partial<Lead> = {
      name: personName ?? 'Unknown',
      role: role ?? 'Unknown',
      company: companyName,
      companyWebsite: '',
      linkedinUrl: '',
      industry: '',
      companySize: 'Unknown',
      publicSignals: [],
      thetaFitAnalysis: result.result ?? 'Analysis pending',
      confidenceScore: 0.5,
      suggestedFirstMessage: '',
      suggestedFollowUp: '',
      status: 'researched',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const category = await categorizeLead(lead)
    await saveLead(lead as Lead, category)
  }

  return result
}

export async function analyzeFit(
  companyName: string,
  website: string,
): Promise<ExecuteResult> {
  const result = await determineThetaFit(companyName, website)

  if (result.success) {
    const dir = resolve(LINKEDIN_ROOT, 'tracking')
    await mkdir(dir, { recursive: true })
    const filePath = resolve(dir, `${companyName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-fit.json`)
    await writeFile(filePath, JSON.stringify({
      company: companyName,
      website,
      analysis: result.result,
      confidence: extractConfidence(result.result),
      timestamp: new Date().toISOString(),
    }, null, 2))
  }

  return result
}

export async function generateLeadOutreach(
  leadName: string,
  company: string,
): Promise<ExecuteResult> {
  const result = await generateOutreach({
    companyName: company,
    targetName: leadName,
  })

  if (result.success && result.result) {
    const msgDir = resolve(LINKEDIN_ROOT, 'messages')
    await mkdir(msgDir, { recursive: true })
    const filePath = resolve(msgDir, `${company.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${leadName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.md`)
    await writeFile(filePath, [
      `# Outreach: ${leadName} @ ${company}`,
      '',
      `**Generated:** ${new Date().toISOString()}`,
      `**Status:** Pending Review`,
      '',
      '---',
      '',
      result.result,
      '',
      '---',
      '',
      '*Review before sending. Human approval required.*',
    ].join('\n'), 'utf-8')
  }

  return result
}

export async function saveLead(lead: Lead, category: LeadCategory): Promise<string> {
  const dir = resolve(LINKEDIN_ROOT, category.directory)
  await mkdir(dir, { recursive: true })

  const fileName = `${lead.company.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${lead.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.json`
  const filePath = resolve(dir, fileName)
  await writeFile(filePath, JSON.stringify(lead, null, 2), 'utf-8')
  return filePath
}

export async function readLead(company: string, name: string): Promise<Lead | null> {
  for (const cat of CATEGORIES) {
    const dir = resolve(LINKEDIN_ROOT, cat.directory)
    const fileName = `${company.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.json`
    const filePath = resolve(dir, fileName)
    if (existsSync(filePath)) {
      return JSON.parse(await readFile(filePath, 'utf-8'))
    }
  }
  return null
}

export async function listLeads(category?: string): Promise<Lead[]> {
  const leads: Lead[] = []
  const cats = category
    ? CATEGORIES.filter((c) => c.name === category)
    : CATEGORIES

  for (const cat of cats) {
    const dir = resolve(LINKEDIN_ROOT, cat.directory)
    if (!existsSync(dir)) continue
    const files = await readdir(dir)
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await readFile(resolve(dir, file), 'utf-8')
        leads.push(JSON.parse(content))
      }
    }
  }

  return leads
}

async function categorizeLead(lead: Partial<Lead>): Promise<LeadCategory> {
  const role = lead.role?.toLowerCase() ?? ''
  if (role.includes('founder') || role.includes('ceo') || role.includes('startup')) {
    return CATEGORIES[0]
  }
  if (role.includes('agency') || role.includes('owner') || role.includes('director')) {
    return CATEGORIES[1]
  }
  if (role.includes('project manager') || role.includes('product manager') || role.includes('engineering manager')) {
    return CATEGORIES[2]
  }
  if (role.includes('operations') || role.includes('coo') || role.includes('team lead')) {
    return CATEGORIES[3]
  }
  return CATEGORIES[0]
}

function extractConfidence(analysis: string | null | undefined): number {
  if (!analysis) return 0.5
  const match = analysis.match(/(\d+)(?:\s*\/\s*10|\s*out\s*of\s*10)/i)
  if (match) return parseInt(match[1]) / 10
  const scoreMatch = analysis.match(/confidence[:\s]+(\d+\.?\d*)/i)
  if (scoreMatch) return parseFloat(scoreMatch[1])
  return 0.5
}
