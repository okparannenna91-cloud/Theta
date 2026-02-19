"use client";

import { motion, animate } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Check,
  Zap,
  Users,
  BarChart3,
  Shield,
  Sparkles,
  ArrowRight,
  Layers,
  Slack,
  Calendar,
  Database,
  Star,
  Quote,
  Brain,
  Wand2,
  MessageSquare,
  Cpu
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

// Fixed AnimatedNumber component
function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.5,
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value]);

  return (
    <span className="text-4xl md:text-5xl font-extrabold text-indigo-600">
      {displayValue.toLocaleString()}{value > 100 ? "+" : ""}
    </span>
  );
}

function StatsSection() {
  const [stats, setStats] = useState({
    activeUsers: 0,
    dailyTasks: 0,
    uptimeSLA: 99.9,
    teamWorkspaces: 0,
  });

  useEffect(() => {
    fetch("/api/landing/stats")
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => { });
  }, []);

  return (
    <section className="container mx-auto px-4 py-16 border-y border-slate-200 bg-white/50">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
        <div className="text-center">
          <AnimatedNumber value={stats.activeUsers} />
          <p className="text-slate-500 font-medium text-sm sm:text-base mt-1 uppercase tracking-wider">Active Users</p>
        </div>
        <div className="text-center">
          <AnimatedNumber value={stats.dailyTasks} />
          <p className="text-slate-500 font-medium text-sm sm:text-base mt-1 uppercase tracking-wider">Total Tasks</p>
        </div>
        <div className="text-center">
          <AnimatedNumber value={stats.uptimeSLA} />
          <p className="text-slate-500 font-medium text-sm sm:text-base mt-1 uppercase tracking-wider">Uptime SLA</p>
        </div>
        <div className="text-center">
          <AnimatedNumber value={stats.teamWorkspaces} />
          <p className="text-slate-500 font-medium text-sm sm:text-base mt-1 uppercase tracking-wider">Workspaces</p>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Image src="/Logo.png" alt="Theta Logo" width={44} height={44} className="rounded-xl shadow-md border-2 border-indigo-100" />
            <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 bg-clip-text text-transparent tracking-tighter">
              Theta
            </span>
          </motion.div>

          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600 uppercase tracking-widest">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How it Works</a>
            <a href="#teams" className="hover:text-indigo-600 transition-colors">Teams</a>
            <Link href="/pricing" className="hover:text-indigo-600 transition-colors">Pricing</Link>
          </div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 sm:gap-4 items-center">
            <SignInButton mode="modal">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex font-black border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-xl px-6">
                SIGN IN
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 font-black text-white shadow-xl shadow-indigo-200 rounded-xl px-6 flex items-center gap-2">
                GET STARTED <Zap className="w-3 h-3 fill-white" />
              </Button>
            </SignUpButton>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
        {/* Background Hero Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero.jpg"
            alt="Theta background"
            fill
            className="object-cover scale-105 animate-pulse-slow font-medium"
            priority
          />
          {/* Modern Dark Overlay with Multi-stop Gradient */}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/80 to-indigo-950/40 backdrop-blur-[1px]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-950/20 to-slate-950/60"></div>
        </div>

        <div className="container mx-auto px-4 relative z-20">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-indigo-100 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-10 border border-white/20 backdrop-blur-xl shadow-2xl">
                <Sparkles className="w-3 h-3 text-indigo-400" /> The Future of Multi-Tenancy Management
              </span>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-5xl sm:text-7xl lg:text-9xl font-black mb-8 leading-[1.05] tracking-tight text-white"
              >
                Project Management <br />
                <span className="text-indigo-400 italic">Redefined.</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-lg sm:text-xl lg:text-2xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed font-medium"
              >
                Theta is the all-in-one workspace for high-performing teams. <br className="hidden sm:block" />
                Secure, real-time, and built for scale.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-6 justify-center items-center"
              >
                <SignUpButton mode="modal">
                  <Button size="lg" className="w-full sm:w-auto text-xl h-16 px-12 bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/40 font-bold rounded-2xl group transition-all hover:scale-105 active:scale-95 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    Start Free Trial
                    <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </SignUpButton>
                <Link href="/pricing" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-xl h-16 px-12 border-white/20 hover:bg-white/10 text-white font-bold rounded-2xl backdrop-blur-md transition-all hover:border-white/40 shadow-xl">
                    Full Pricing
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Decorative element at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 to-transparent z-10"></div>
      </section>

      {/* Real-time Stats */}
      <StatsSection />

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-24 sm:py-32">
        <div className="text-center mb-16 lg:mb-24">
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6">Engineered for Velocity</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Every feature is fine-tuned to help your team ship faster while maintaining absolute data isolation and security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: Zap, title: "Ably Powered Real-time", description: "Experience zero-latency task updates and collaborative live boards." },
            { icon: Shield, title: "Multi-Tenant Isolation", description: "Enterprise-grade workspace separation ensures your data stays private." },
            { icon: BarChart3, title: "Advanced Insights", description: "Visualize team velocity and project health with deep analytics tools." },
            { icon: Users, title: "Workspace Invites", description: "Seamlessly onboard team members with secure, tokenized invite links." },
            { icon: Layers, title: "Kanban & Lists", description: "Switch between workflow views to manage tasks exactly how you want." },
            { icon: Database, title: "MongoDB Persistence", description: "High-available, scalable document storage for all your project assets." },
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -8 }}
              className="p-8 bg-white rounded-[2.5rem] border border-slate-200 hover:border-indigo-200 transition-all hover:shadow-2xl shadow-indigo-100 flex flex-col items-center text-center group"
            >
              <div className="p-4 rounded-3xl bg-slate-50 group-hover:bg-indigo-50 transition-colors mb-6">
                <feature.icon className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Meet Boots AI Assistant */}
      <section id="boots-ai" className="relative py-24 sm:py-32 overflow-hidden bg-slate-50">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:w-1/2"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600/10 text-indigo-600 text-sm font-bold uppercase tracking-widest mb-6 border border-indigo-200">
                <Cpu className="w-4 h-4" /> AI Powered
              </div>
              <h2 className="text-4xl sm:text-6xl font-black text-slate-900 mb-8 leading-tight">
                Meet <span className="text-indigo-600">Boots</span>, Your New AI Work Assistant
              </h2>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                Boots isn&apos;t just another chatbot. She&apos;s deeply integrated into your Theta workspace, helping you automate the mundane and focus on what matters most.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <Wand2 className="w-8 h-8 text-indigo-600 mb-4" />
                  <h4 className="font-bold text-slate-900 mb-2">Smart Generation</h4>
                  <p className="text-sm text-slate-500">Generate project plans, task descriptions, and content in seconds.</p>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <Brain className="w-8 h-8 text-indigo-600 mb-4" />
                  <h4 className="font-bold text-slate-900 mb-2">Brainstorming</h4>
                  <p className="text-sm text-slate-500">Stuck? Ask Boots to brainstorm feature ideas or strategy directions.</p>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <MessageSquare className="w-8 h-8 text-indigo-600 mb-4" />
                  <h4 className="font-bold text-slate-900 mb-2">Context Aware</h4>
                  <p className="text-sm text-slate-500">Boots understands your workspace data to provide relevant assistance.</p>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <Zap className="w-8 h-8 text-indigo-600 mb-4" />
                  <h4 className="font-bold text-slate-900 mb-2">Productivity Boost</h4>
                  <p className="text-sm text-slate-500">Automate repetitive tasks and get suggestions to optimize your workflow.</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="lg:w-1/2 relative"
            >
              <div className="absolute inset-0 bg-indigo-600/20 blur-[100px] rounded-full"></div>
              <div className="relative bg-slate-900 rounded-[3rem] p-8 shadow-2xl border border-slate-800 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10">
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-xl">👢</div>
                  <div>
                    <h3 className="text-white font-bold">Boots Assistant</h3>
                    <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Active Now</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-start">
                    <div className="bg-slate-800 text-slate-300 p-4 rounded-3xl rounded-tl-none max-w-[80%] text-sm">
                      How can I help you with the &quot;Project Theta&quot; launch today?
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 text-white p-4 rounded-3xl rounded-tr-none max-w-[80%] text-sm shadow-lg shadow-indigo-600/20">
                      Can you brainstorm 5 unique features for our multi-tenant dashboard?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-slate-800 text-slate-300 p-4 rounded-3xl rounded-tl-none max-w-[80%] text-sm">
                      <p className="font-bold text-indigo-400 mb-2">Certainly! Here are 5 ideas:</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li>Real-time tenant resource monitoring</li>
                        <li>Automated usage-based billing alerts</li>
                        <li>Custom branding per workspace</li>
                        <li>Inter-tenant collaboration portals</li>
                        <li>AI-driven task prioritization</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 flex gap-2">
                  <div className="flex-1 bg-slate-800 rounded-2xl p-3 text-slate-500 text-sm">Type your message...</div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Decorative floating elements */}
              <motion.div
                animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute -top-10 -right-5 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 hidden sm:block"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-900">AI Suggested Plan</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-slate-900 text-white overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto mb-20 text-center">
            <h2 className="text-4xl sm:text-5xl font-black mb-6">Launch Your Project in Seconds</h2>
            <p className="text-slate-400 text-lg">We&apos;ve removed the friction. Go from signup to shipping in three simple steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-[60px] left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>

            {[
              { step: "01", title: "Create Workspace", desc: "Sign up and auto-provision your private workspace in our secure cloud." },
              { step: "02", title: "Invite Your Team", desc: "Generate secure invite links and assign roles like Admin or Member." },
              { step: "03", title: "Ship Content", desc: "Collaborate in real-time with Ably-powered boards and workspace chat." },
            ].map((s, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-indigo-500 flex items-center justify-center text-3xl font-black text-indigo-400 mb-8 shadow-[0_0_30px_-10px_rgba(99,102,241,0.5)]">
                  {s.step}
                </div>
                <h3 className="text-2xl font-bold mb-4">{s.title}</h3>
                <p className="text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases / Teams Section */}
      <section id="teams" className="container mx-auto px-4 py-32">
        <div className="flex flex-col lg:flex-row gap-20 items-center">
          <div className="lg:w-1/2">
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-8 leading-tight">Built for Your Team, No Matter the Size</h2>
            <div className="space-y-6">
              {[
                { title: "Software Teams", role: "Sprint planing, bug tracking, and real-time collaboration." },
                { title: "Agency Leaders", role: "Multi-workspace support to manage clients with absolute isolation." },
                { title: "Product Managers", role: "Visual roadmaps and deep analytics to track delivery health." },
              ].map((team, i) => (
                <div key={i} className="flex gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="mt-1">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Check className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{team.title}</h4>
                    <p className="text-slate-600">{team.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:w-1/2 relative">
            <div className="aspect-square bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-[3rem] overflow-hidden shadow-2xl p-4">
              <Image
                src="/subhero.jpg"
                alt="Team collaboration"
                width={800}
                height={800}
                className="object-cover h-full w-full rounded-[2.5rem]"
              />
            </div>
            {/* Overlay card */}
            <div className="absolute -bottom-10 -left-10 bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 max-w-xs hidden sm:block">
              <div className="flex -space-x-2 mb-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200" />)}
              </div>
              <p className="text-sm font-bold text-slate-900">450+ Teams Joined this month</p>
              <p className="text-xs text-slate-500 mt-1">Join the community growing with Theta.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-24 sm:py-32">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-12">
                <div className="aspect-[4/3] bg-slate-100 rounded-3xl p-8 flex flex-col justify-end">
                  <span className="text-3xl font-black text-indigo-600">350%</span>
                  <p className="text-sm font-bold text-slate-600 mt-2">Efficiency Increase</p>
                </div>
                <div className="aspect-[4/5] bg-slate-900 rounded-3xl p-8 text-white flex flex-col justify-center">
                  <Quote className="w-12 h-12 text-indigo-500 mb-4 opacity-50" />
                  <p className="text-xl font-bold leading-tight uppercase tracking-wide italic">&quot;The speed is unlike anything we&apos;ve used.&quot;</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="aspect-square bg-indigo-600 rounded-3xl p-8 text-white flex flex-col justify-center items-center text-center">
                  <Shield className="w-16 h-16 mb-6" />
                  <p className="text-xl font-black">100% SECURE DATA</p>
                </div>
                <div className="aspect-[4/3] bg-indigo-50 rounded-3xl p-8 flex flex-col justify-center">
                  <p className="text-slate-900 font-bold mb-2">INTEGRATIONS</p>
                  <div className="flex gap-4">
                    <Slack className="w-8 h-8 text-slate-400" />
                    <Calendar className="w-8 h-8 text-slate-400" />
                    <Database className="w-8 h-8 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl sm:text-6xl font-black text-slate-900 mb-8 leading-tight">Why Choose Theta?</h2>
              <div className="space-y-12">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 uppercase tracking-tighter">Extreme Velocity</h3>
                  <p className="text-lg text-slate-600">Built on modern tech like Next.js App Router and Ably, Theta provides a snappy, near-instant response time for every action. No more loading spinners when managing your backlog.</p>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 uppercase tracking-tighter">Safety First</h3>
                  <p className="text-lg text-slate-600">Our multi-tenant architecture uses MongoDB sharding-ready patterns to ensure that even on shared hardware, your data is logically and strictly isolated behind robust middleware.</p>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 uppercase tracking-tighter">Predictable Cost</h3>
                  <p className="text-lg text-slate-600">No hidden fees. A Free tier that actually lets you work, and a Lifetime plan that makes Theta your team&apos;s asset, not just a monthly expense.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-24 sm:py-32">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6">Loved by Product Builders</h2>
          <p className="text-lg text-slate-600">Theta powers some of the most innovative startups.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              name: "Sarah Chen",
              role: "CTO @ Fluxio",
              content: "The real-time collaboration is flawless. We moved our entire 40-person engineering team to Theta in one afternoon. The multi-tenant isolation gives us the privacy we need for client projects."
            },
            {
              name: "Marcus Thorne",
              role: "CEO @ Brightside",
              content: "We switched from Jira last month and haven't looked back. Theta is just faster. The UI is gorgeous, and our project managers are actually completing tasks on time now. The billing is fair too!"
            },
            {
              name: "Lina Rodriguez",
              role: "Lead Designer @ PixelPerfect",
              content: "Theta feels like it was designed by people who actually use project tools. It's clean, minimalist, but packed with features like the real-time chat. The lifetime plan was a no-brainer for us."
            },
          ].map((t, i) => (
            <div key={i} className="p-8 bg-white rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-100/50 flex flex-col justify-between">
              <div>
                <div className="flex gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map(j => <Star key={j} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-lg text-slate-700 italic leading-relaxed font-medium mb-8">&quot;{t.content}&quot;</p>
              </div>
              <div className="flex items-center gap-4 border-t border-slate-100 pt-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100" />
                <div>
                  <h4 className="font-bold text-slate-900">{t.name}</h4>
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="relative bg-indigo-600 rounded-[4rem] p-12 sm:p-20 text-center text-white overflow-hidden shadow-2xl shadow-indigo-200"
        >
          <div className="relative z-10">
            <h2 className="text-4xl sm:text-7xl font-black mb-8 leading-tight">Elevate Your Team <br /> Performance Today</h2>
            <p className="text-xl sm:text-2xl mb-12 text-indigo-100 max-w-2xl mx-auto opacity-90">
              Join 2,400+ teams who have already switched to Theta for a better workspace experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <SignUpButton mode="modal">
                <Button size="lg" className="text-xl h-16 h-px-12 bg-white text-indigo-600 hover:bg-slate-50 w-full sm:w-auto font-black rounded-2xl px-12">
                  Get Started Free
                </Button>
              </SignUpButton>
              <Link href="/pricing" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="text-xl h-16 px-12 border-indigo-400 text-white hover:bg-indigo-500 w-full sm:w-auto font-black rounded-2xl">
                  Explore Pricing
                </Button>
              </Link>
            </div>
          </div>

          {/* Decorative shapes */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full blur-[80px] opacity-50"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500 rounded-full blur-[80px] opacity-50"></div>
        </motion.div>
      </section>

      {/* Real Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 pt-20 pb-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 mb-20">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Image src="/Logo.png" alt="Theta Logo" width={40} height={40} className="rounded-xl shadow-sm" />
                <span className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Theta
                </span>
              </div>
              <p className="text-slate-500 text-lg leading-relaxed max-w-xs mb-8">
                Building the most intuitive, feature-complete project management toolkit for modern teams.
              </p>
              <div className="flex gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-indigo-50 transition-colors cursor-pointer" />)}
              </div>
            </div>

            <div className="hidden lg:block" />

            <div>
              <h4 className="font-black text-slate-900 mb-6 uppercase tracking-widest text-xs">Product</h4>
              <ul className="space-y-4 text-slate-500 font-medium">
                <li><a href="#features" className="hover:text-indigo-600 transition-colors">Features</a></li>
                <li><Link href="/pricing" className="hover:text-indigo-600 transition-colors">Pricing</Link></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Roadmap</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-black text-slate-900 mb-6 uppercase tracking-widest text-xs">Company</h4>
              <ul className="space-y-4 text-slate-500 font-medium">
                <li><a href="#" className="hover:text-indigo-600 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-black text-slate-900 mb-6 uppercase tracking-widest text-xs">Resources</h4>
              <ul className="space-y-4 text-slate-500 font-medium">
                <li><Link href="/docs" className="hover:text-indigo-600 transition-colors">Documentation</Link></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Status</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-10 border-t border-slate-200 text-slate-400 text-sm font-bold uppercase tracking-wider">
            <p>&copy; 2026 Theta. Built by Pioneers.</p>
            <div className="flex gap-8">
              <Link href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-indigo-600 transition-colors">Terms of Service</Link>
              <Link href="/docs" className="hover:text-indigo-600 transition-colors">Documentation</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
