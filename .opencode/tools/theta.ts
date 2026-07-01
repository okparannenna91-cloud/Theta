import { tool } from "@opencode-ai/plugin"
import * as agent from "../skills/theta-growth-engineer/agent"

export const review = tool({
  description: "Review Theta's current version, capabilities, and state before starting lead research",
  args: {},
  async execute() {
    return await agent.reviewTheta()
  },
})

export const discover_leads = tool({
  description: "Discover potential leads for Theta in a specific industry. Uses web search to identify companies and decision-makers.",
  args: {
    industry: tool.schema.string().describe("Target industry to search for leads (e.g. 'SaaS', 'marketing agencies', 'consulting')"),
  },
  async execute(args) {
    return await agent.discoverLeads(args.industry)
  },
})

export const research_lead = tool({
  description: "Deep research a company and person for Theta fit analysis. Uses web search to gather company info, team structure, and growth signals.",
  args: {
    companyName: tool.schema.string().describe("Company name to research"),
    personName: tool.schema.string().optional().describe("Target person name at the company"),
    role: tool.schema.string().optional().describe("Target person's role"),
  },
  async execute(args) {
    return await agent.researchLead(args.companyName, args.personName, args.role)
  },
})

export const analyze_fit = tool({
  description: "Evaluate how well a company fits Theta's ideal customer profile. Uses web search to analyze website and public information.",
  args: {
    companyName: tool.schema.string().describe("Company name to analyze"),
    website: tool.schema.string().describe("Company website URL"),
  },
  async execute(args) {
    return await agent.analyzeFit(args.companyName, args.website)
  },
})

export const generate_outreach = tool({
  description: "Generate a personalized LinkedIn outreach message for a qualified lead. Does NOT send automatically - human approval is required.",
  args: {
    leadName: tool.schema.string().describe("Name of the lead to message"),
    company: tool.schema.string().describe("Company name of the lead"),
  },
  async execute(args) {
    return await agent.generateLeadOutreach(args.leadName, args.company)
  },
})

export const list_leads = tool({
  description: "List all saved leads from the LinkedIn directory, optionally filtered by category.",
  args: {
    category: tool.schema.string().optional().describe("Filter by category: startup-founders, agency-owners, project-managers, operations"),
  },
  async execute(args) {
    const leads = await agent.listLeads(args.category)
    if (leads.length === 0) {
      return "No leads found."
    }
    const summary = leads.map((l) =>
      `- ${l.name} @ ${l.company} (${l.role}) — Confidence: ${l.confidenceScore} — Status: ${l.status}`
    ).join("\n")
    return `Found ${leads.length} lead(s):\n\n${summary}`
  },
})
