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
  description: "Discover potential leads for Theta in a specific industry. Uses browser automation to search and identify companies and decision-makers.",
  args: {
    industry: tool.schema.string().describe("Target industry to search for leads (e.g. 'SaaS', 'marketing agencies', 'consulting')"),
  },
  async execute(args) {
    const result = await agent.discoverLeads(args.industry)
    if (!result.success) {
      return JSON.stringify({ error: result.error?.message ?? "Unknown error", details: result.error?.details })
    }
    return result.result ?? JSON.stringify({ message: "No leads found" })
  },
})

export const research_lead = tool({
  description: "Deep research a company and person for Theta fit analysis. Uses browser automation to gather company info, team structure, and growth signals.",
  args: {
    companyName: tool.schema.string().describe("Company name to research"),
    personName: tool.schema.string().optional().describe("Target person name at the company"),
    role: tool.schema.string().optional().describe("Target person's role"),
  },
  async execute(args) {
    const result = await agent.researchLead(args.companyName, args.personName, args.role)
    if (!result.success) {
      return JSON.stringify({ error: result.error?.message ?? "Unknown error" })
    }
    return result.result ?? JSON.stringify({ message: "Research complete" })
  },
})

export const analyze_fit = tool({
  description: "Evaluate how well a company fits Theta's ideal customer profile. Uses browser automation to analyze website and public information.",
  args: {
    companyName: tool.schema.string().describe("Company name to analyze"),
    website: tool.schema.string().describe("Company website URL"),
  },
  async execute(args) {
    const result = await agent.analyzeFit(args.companyName, args.website)
    if (!result.success) {
      return JSON.stringify({ error: result.error?.message ?? "Unknown error" })
    }
    return result.result ?? JSON.stringify({ message: "Analysis complete" })
  },
})

export const generate_outreach = tool({
  description: "Generate a personalized LinkedIn outreach message for a qualified lead. Does NOT send automatically - human approval is required.",
  args: {
    leadName: tool.schema.string().describe("Name of the lead to message"),
    company: tool.schema.string().describe("Company name of the lead"),
  },
  async execute(args) {
    const result = await agent.generateLeadOutreach(args.leadName, args.company)
    if (!result.success) {
      return JSON.stringify({ error: result.error?.message ?? "Unknown error" })
    }
    return result.result ?? JSON.stringify({ message: "Outreach message generated" })
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
