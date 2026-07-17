import { Bot, Zap, FileEdit, ListTodo, ClipboardList, Calculator, MessageSquare, Terminal, Activity as ActivityIcon, BookOpen, Eraser } from "lucide-react";

export interface Message {
  role: "user" | "nova";
  content: string;
  timestamp: Date;
  attachments?: Array<{ name: string; type: string; url: string }>;
  id?: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessageAt: string;
  isPinned: boolean;
}

export interface PageContext {
  path: string;
  type: string;
}

export const SLASH_COMMANDS = [
  { icon: ListTodo, label: "Create Task", command: "/task ", description: "Turn this thought into a task" },
  { icon: BookOpen, label: "Summarize", command: "/summarize", description: "Summarize the current view" },
  { icon: Eraser, label: "Clear Chat", command: "/clear", description: "Reset the conversation" },
  { icon: Terminal, label: "Debug", command: "/debug", description: "Show system diagnostics" },
];

export const BLUEPRINTS = [
  { name: "Bug Report Architect", desc: "Structured bug reproduction steps", icon: Bot, prompt: "Create a bug report for " },
  { name: "Sprint Planner", desc: "Generate milestones and tasks", icon: Zap, prompt: "Plan a sprint for " },
  { name: "PRD Drafter", desc: "Draft a full product requirement doc", icon: FileEdit, prompt: "Draft a PRD for " },
  { name: "Task Breakdown", desc: "Decompose complex tasks", icon: ListTodo, prompt: "Break down this task: " },
  { name: "Status Report", desc: "Generate a workspace status report", icon: ClipboardList, prompt: "Generate a status report for " },
  { name: "Velocity Calc", desc: "Calculate team velocity", icon: Calculator, prompt: "Calculate the team velocity for " },
];

export const QUICK_ACTIONS = [
  { label: "Summarize", icon: ClipboardList, color: "bg-primary/10 text-primary", prompt: "Summarize my active tasks." },
  { label: "Daily Standup", icon: MessageSquare, color: "bg-emerald-500/10 text-emerald-500", prompt: "Prepare a daily standup for me." },
  { label: "Draft Spec", icon: FileEdit, color: "bg-amber-500/10 text-amber-500", prompt: "Draft a technical spec for the current project." },
  { label: "Calc Velocity", icon: Calculator, color: "bg-purple-500/10 text-purple-500", prompt: "Calculate the team velocity." },
  { label: "Audit Backlog", icon: ListTodo, color: "bg-rose-500/10 text-rose-500", prompt: "Audit my task backlog and suggest priorities." },
  { label: "Check Health", icon: ActivityIcon, color: "bg-indigo-500/10 text-indigo-500", prompt: "Run a project health check." },
];
