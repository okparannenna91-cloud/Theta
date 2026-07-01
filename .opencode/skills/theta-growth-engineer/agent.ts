import { readFile, writeFile, mkdir, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve } from 'path'

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

export async function discoverLeads(industry: string): Promise<string> {
  return `Research and discover potential leads for Theta in the "${industry}" industry. Use web search to find:
1. Companies that are growing or hiring
2. Key decision makers (Founders, CEOs, CTOs, PMs)
3. Companies with multiple teams or projects
4. Remote-first or distributed teams
5. Companies showing operational or collaboration challenges

Use the websearch tool to find companies, then save leads using the lead tools.`
}

export async function researchLead(
  companyName: string,
  personName?: string,
  role?: string,
): Promise<string> {
  return `Research the company "${companyName}"${personName ? ` and person "${personName}"` : ''}${role ? ` in role "${role}"` : ''}. Use web search to find:
1. Company overview, size, industry, and team structure
2. Recent news, funding, growth signals
3. Their project management needs and challenges
4. Person's role and background

After researching, save the lead using saveLead.`
}

export async function analyzeFit(companyName: string, website: string): Promise<string> {
  const dir = resolve(LINKEDIN_ROOT, 'tracking')
  await mkdir(dir, { recursive: true })
  const filePath = resolve(dir, `${companyName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-fit.json`)
  await writeFile(filePath, JSON.stringify({
    company: companyName,
    website,
    analysis: `Fit analysis pending for ${companyName}. Use web search to research their team size, industry, and project management needs.`,
    confidence: 0.5,
    timestamp: new Date().toISOString(),
  }, null, 2))
  return `Fit analysis template saved for ${companyName} (${website}). Use web search to gather more information and update the analysis.`
}

export async function generateLeadOutreach(leadName: string, company: string): Promise<string> {
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
    `Generate a personalized LinkedIn outreach message for ${leadName} at ${company}.`,
    '',
    'Rules:',
    '1. Reference something real about their company or role',
    '2. Explain why Theta is relevant to their specific situation',
    '3. Be conversational and human',
    '4. Do NOT use: "Hope you\'re doing well", "revolutionize", "game changer"',
    '5. Do NOT ask for a meeting or demo',
    '6. End with a soft, natural call to action',
    '',
    '---',
    '',
    '*Review before sending. Human approval required.*',
  ].join('\n'), 'utf-8')
  return `Outreach message template saved for ${leadName} at ${company}. Edit the file at ${filePath} with your personalized message.`
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
