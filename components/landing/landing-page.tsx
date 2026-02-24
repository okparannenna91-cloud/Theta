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
import { MotionWrapper, FadeIn, ScaleIn } from "@/components/common/motion-wrapper";

// Fixed AnimatedNumber component with premium styling
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value]);

  return (
    <span className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter tabular-nums">
      {displayValue.toLocaleString()}{suffix}
    </span>
  );
}

function StatsSection() {
  const [stats, setStats] = useState({
    activeUsers: 2400,
    dailyTasks: 18500,
    uptimeSLA: 99.9,
    teamWorkspaces: 450,
  });

  useEffect(() => {
    fetch("/api/landing/stats")
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => { });
  }, []);

  return (
    <section className="relative py-24 border-y border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
        {[
          { label: "Active Nodes", value: stats.activeUsers, suffix: "+" },
          { label: "Synced Tasks", value: stats.dailyTasks, suffix: "k" },
          { label: "Uptime SLA", value: stats.uptimeSLA, suffix: "%" },
          { label: "Clusters", value: stats.teamWorkspaces, suffix: "" },
        ].map((stat, i) => (
          <FadeIn key={i} delay={i * 0.1}>
            <div className="flex flex-col items-center lg:items-start space-y-2">
              <AnimatedNumber value={stat.value === 18500 ? 18.5 : stat.value} suffix={stat.suffix} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">{stat.label}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-white/70 backdrop-blur-2xl border-b border-white/10 shadow-[0_2px_40px_-10px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 group"
          >
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/20 group-hover:scale-110 transition-transform duration-500">
              <Image src="/Logo.png" alt="Theta Logo" fill className="object-cover" />
            </div>
            <span className="text-3xl font-black tracking-tighter text-gradient">
              Theta
            </span>
          </motion.div>

          <div className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mr-10">
            <a href="#features" className="hover:text-primary transition-all hover:tracking-[0.25em]">Features</a>
            <a href="#how-it-works" className="hover:text-primary transition-all hover:tracking-[0.25em]">Process</a>
            <a href="#teams" className="hover:text-primary transition-all hover:tracking-[0.25em]">Team</a>
            <Link href="/pricing" className="hover:text-primary transition-all hover:tracking-[0.25em]">Pricing</Link>
          </div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-4 items-center">
            <SignInButton mode="modal">
              <Button variant="ghost" className="hidden sm:inline-flex font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-[1.25rem] hover:bg-secondary/80">
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button className="bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] text-white shadow-[0_15px_30px_-10px_rgba(139,92,246,0.3)] h-12 px-10 rounded-[1.25rem] flex items-center gap-2 group transition-all duration-500 hover:scale-[1.05] active:scale-95">
                Get Started <Zap className="w-4 h-4 fill-white group-hover:animate-pulse" />
              </Button>
            </SignUpButton>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0 mesh-gradient opacity-40"></div>
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_120%,rgba(139,92,246,0.15),transparent_50%)]"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 py-20 lg:py-32">
          <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-12 border border-primary/20 backdrop-blur-3xl shadow-2xl">
                <Sparkles className="w-3.5 h-3.5" /> Synchronizing Reality
              </div>

              <h1 className="text-6xl sm:text-8xl lg:text-[10rem] font-black mb-10 leading-[0.85] tracking-tight text-slate-950 dark:text-white">
                ORCHESTRATE <br />
                <span className="text-gradient italic">FLOW.</span>
              </h1>

              <p className="text-xl lg:text-3xl text-slate-600 dark:text-slate-400 mb-16 max-w-3xl mx-auto leading-relaxed font-medium tracking-tight">
                Experience the next evolution of project synchronization. <br className="hidden sm:block" />
                Autonomous, beautiful, and built for high-velocity teams.
              </p>

              <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
                <SignUpButton mode="modal">
                  <Button size="lg" className="h-20 px-14 bg-primary hover:bg-primary/90 text-white shadow-[0_20px_40px_-15px_rgba(139,92,246,0.5)] font-black uppercase tracking-[0.15em] text-sm rounded-[2rem] group transition-all duration-500 hover:scale-[1.05] active:scale-95 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    Initialize Beta
                    <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform duration-500" />
                  </Button>
                </SignUpButton>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="h-20 px-14 border-primary/20 bg-white/50 backdrop-blur-xl hover:bg-white/80 text-foreground font-black uppercase tracking-[0.15em] text-sm rounded-[2rem] transition-all duration-500 hover:border-primary/40 shadow-xl">
                    Full Protocol
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Floating Background Effects */}
        <motion.div
          animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-0 -z-10 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full"
        />
        <motion.div
          animate={{ y: [0, 40, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-0 right-0 -z-10 w-[500px] h-[500px] bg-blue-500/10 blur-[150px] rounded-full"
        />
      </section>

      {/* Real-time Stats */}
      <StatsSection />

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-32 sm:py-48 relative">
        <div className="absolute top-0 right-1/4 -z-10 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full" />

        <div className="text-center mb-24 lg:mb-32">
          <FadeIn>
            <h2 className="text-5xl sm:text-7xl font-black text-slate-950 dark:text-white mb-8 tracking-tighter">Engineered for <span className="text-gradient">Velocity</span></h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium">
              Every interface interaction is fine-tuned to help your team ship faster while maintaining absolute structural integrity.
            </p>
          </FadeIn>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {[
            { icon: Zap, title: "Zero Latency Sync", description: "Experience sub-50ms task updates and collaborative live boards powered by Ably." },
            { icon: BarChart3, title: "Deep Analytics", description: "Visualize project roadmaps with high-fidelity Gantt charts and performance timelines." },
            { icon: Layers, title: "Portfolio Health", description: "Strategic dashboard to monitor all projects and overall organizational health at a glance." },
            { icon: Shield, title: "Atomic Isolation", description: "Enterprise-grade workspace separation ensures your data stays logically private and secure." },
            { icon: Users, title: "Rapid Onboarding", description: "Seamlessly integrate team members with secure, tokenized invite links and role-based access." },
            { icon: Database, title: "Dynamic Automations", description: "Set up complex triggers to automate repetitive tasks and cross-workspace status updates." },
          ].map((feature, i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <div
                className="p-10 glass-card rounded-[3rem] border border-white/10 hover:border-primary/30 transition-all duration-500 flex flex-col items-center text-center group"
              >
                <div className="p-6 rounded-[2rem] bg-secondary/50 group-hover:bg-primary/10 transition-colors duration-500 mb-8 group-hover:scale-110 group-hover:rotate-3">
                  <feature.icon className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-black text-slate-950 dark:text-white mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{feature.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>


        {/* Advanced Tools Showcase */}
        <FadeIn delay={0.3}>
          <div className="mt-32 relative bg-slate-950 rounded-[4rem] p-10 sm:p-20 overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/5 group">
            <div className="absolute inset-0 mesh-gradient opacity-20" />
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Layers className="w-80 h-80 text-white" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
              <div>
                <span className="text-primary text-[10px] font-black uppercase tracking-[0.4em] mb-6 block">Professional Grade Suite</span>
                <h2 className="text-4xl sm:text-6xl font-black text-white mb-10 leading-[0.9] tracking-tighter">MASTER EVERY <br />PROJECT.</h2>
                <p className="text-slate-400 text-lg mb-12 leading-relaxed font-medium">
                  Theta goes beyond basic task management. Every feature is engineered for world-class PMO workflows — from strategic portfolio views to precision time logging.
                </p>
                <div className="space-y-8">
                  {[
                    { t: "Strategic Portfolio Tracking", d: "A bird's-eye view of all workspace projects with real-time health indicators." },
                    { t: "Precision Gantt & Timelines", d: "Manage complex dependencies and long-term roadmaps with interactive charts." },
                    { t: "Task-Level Time Logging", d: "Log every second of work with our integrated task-level stopwatch precision timer." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-5">
                      <div className="h-7 w-7 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-white font-black text-sm tracking-tight mb-1">{item.t}</h4>
                        <p className="text-slate-500 text-sm font-medium">{item.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative group/mock">
                <div className="absolute -inset-6 bg-primary/10 blur-3xl rounded-full opacity-0 group-hover/mock:opacity-100 transition-opacity duration-700" />
                <div className="relative glass rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-6 py-4 bg-white/5 border-b border-white/5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                    <div className="ml-4 h-4 w-32 bg-white/10 rounded-full" />
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-28 bg-white/20 rounded-lg" />
                      <div className="h-4 w-14 bg-white/10 rounded-lg" />
                    </div>
                    <div className="space-y-3">
                      <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-2/3 bg-primary rounded-full" />
                      </div>
                      <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-1/3 bg-emerald-500 rounded-full" />
                      </div>
                      <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-4/5 bg-blue-500 rounded-full" />
                      </div>
                    </div>
                    <div className="pt-2 grid grid-cols-7 gap-2">
                      {Array.from({ length: 21 }).map((_, i) => (
                        <div key={i} className={`h-12 rounded-xl ${i % 3 === 0 ? 'bg-primary/20 border border-primary/30' : 'bg-white/5'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>


      {/* Meet Boots AI Assistant */}
      <section id="boots-ai" className="relative py-32 sm:py-48 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-10"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-20 lg:gap-32">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:w-1/2"
            >
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-2xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.25em] mb-10 border border-primary/20 backdrop-blur-3xl shadow-2xl">
                <Cpu className="w-4 h-4" /> Neural Engine Active
              </div>
              <h2 className="text-5xl sm:text-7xl font-black text-slate-950 dark:text-white mb-10 leading-[0.9] tracking-tighter">
                MEET <span className="text-gradient">BOOTS</span>, <br />
                YOUR CO-PILOT.
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 leading-relaxed font-medium">
                Boots is a deeply integrated intelligence layer within your workspace, transcending traditional chatbots to provide autonomous project optimization.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { icon: Wand2, title: "Neural Generation", desc: "Synthesize project architectures and complex documentation in milliseconds." },
                  { icon: Brain, title: "Strategic Insight", desc: "Access high-level brainstorming and strategic roadmapping on demand." },
                  { icon: MessageSquare, title: "Semantic Context", desc: "Boots possesses total awareness of your workspace's semantic relationships." },
                  { icon: Zap, title: "Fluid Efficiency", desc: "Automate complex multi-step workflows with natural language commands." },
                ].map((item, i) => (
                  <div key={i} className="p-8 glass rounded-[2rem] border border-white/10 hover:border-primary/20 transition-all duration-300 group">
                    <item.icon className="w-8 h-8 text-primary mb-5 group-hover:scale-110 transition-transform" />
                    <h4 className="font-black text-slate-900 dark:text-white mb-2 tracking-tight">{item.title}</h4>
                    <p className="text-sm text-slate-500 font-medium">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="lg:w-1/2 relative"
            >
              <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full"></div>
              <div className="relative glass-card rounded-[3.5rem] p-8 lg:p-12 shadow-2xl border border-white/10 overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />

                <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-3xl shadow-lg shadow-primary/20 group-hover:rotate-6 transition-transform">👢</div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Boots Protocol</h3>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-primary text-[10px] font-black uppercase tracking-widest">Neural Link Steady</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8 min-h-[300px]">
                  <div className="flex justify-start">
                    <div className="bg-secondary/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 p-6 rounded-[2rem] rounded-tl-none max-w-[85%] text-sm font-medium leading-relaxed border border-white/5">
                      Operational. I've analyzed the current project trajectory. Shall we initialize the sprint optimization sequence?
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-primary text-white p-6 rounded-[2rem] rounded-tr-none max-w-[85%] text-sm font-bold shadow-xl shadow-primary/20 leading-relaxed">
                      Optimize the dashboard architecture for high-density multi-tenant layouts.
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-secondary/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 p-6 rounded-[2rem] rounded-tl-none max-w-[85%] text-sm font-medium border border-white/5">
                      <p className="font-black text-primary mb-3 uppercase tracking-wider text-xs">Analysis Complete:</p>
                      <ul className="space-y-3">
                        {["Deploy dynamic glassmorphism layers", "Initialize neural padding adjustments", "Synchronize real-time tenant state", "Optimize sub-50ms render cycles"].map((li, i) => (
                          <li key={i} className="flex gap-3 items-center">
                            <span className="w-1 h-1 rounded-full bg-primary" />
                            {li}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="mt-12 pt-8 border-t border-white/5 flex gap-4">
                  <div className="flex-1 bg-secondary/30 dark:bg-slate-900/50 rounded-2xl p-4 text-slate-500 text-sm font-medium border border-white/5">Command request...</div>
                  <Button className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all">
                    <ArrowRight className="w-6 h-6" />
                  </Button>
                </div>
              </div>

              {/* Decorative floating elements */}
              <motion.div
                animate={{ y: [0, -20, 0], rotate: [0, 8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-12 -right-6 glass p-5 rounded-2xl shadow-2xl border border-white/20 hidden lg:block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-950 dark:text-white">Neural Suggestion</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      {/* How It Works Section */}
      <section id="how-it-works" className="relative py-32 sm:py-48 overflow-hidden">
        <div className="absolute inset-0 bg-slate-950" />
        <div className="absolute inset-0 mesh-gradient opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.08),transparent_60%)]" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto mb-24 text-center">
            <FadeIn>
              <h2 className="text-5xl sm:text-7xl font-black text-white mb-8 tracking-tighter leading-[0.9]">INITIALIZED <br /><span className="text-gradient">IN SECONDS.</span></h2>
              <p className="text-xl text-slate-400 font-medium leading-relaxed">Friction eliminated. Go from zero to operational in three precise steps.</p>
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-16 relative">
            <div className="hidden md:block absolute top-[52px] left-[calc(16%+40px)] right-[calc(16%+40px)] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            {[
              { step: "01", title: "Provision Workspace", desc: "Sign up and auto-provision your isolated, private workspace in the secure Theta cloud infrastructure." },
              { step: "02", title: "Deploy Your Team", desc: "Generate cryptographically secure invite links and assign granular roles with precision access control." },
              { step: "03", title: "Execute & Ship", desc: "Collaborate with sub-50ms Ably-powered live boards, real-time task sync, and workspace-level intelligence." },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 0.15}>
                <div className="relative z-10 flex flex-col items-center text-center group">
                  <div className="w-24 h-24 rounded-[2rem] glass border border-primary/20 flex items-center justify-center text-4xl font-black text-primary mb-10 shadow-[0_0_60px_-20px_rgba(139,92,246,0.4)] group-hover:shadow-[0_0_80px_-15px_rgba(139,92,246,0.6)] group-hover:scale-110 transition-all duration-500">
                    {s.step}
                  </div>
                  <h3 className="text-2xl font-black text-white mb-5 tracking-tight">{s.title}</h3>
                  <p className="text-slate-400 leading-relaxed font-medium">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Teams Section */}
      <section id="teams" className="max-w-7xl mx-auto px-6 py-32 sm:py-48">
        <div className="flex flex-col lg:flex-row gap-20 lg:gap-32 items-center">
          <FadeIn className="lg:w-1/2">
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-2xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.25em] mb-10 border border-primary/20">
              <Users className="w-4 h-4" /> Built for Every Team
            </div>
            <h2 className="text-5xl sm:text-7xl font-black text-slate-950 dark:text-white mb-10 leading-[0.9] tracking-tighter">YOUR TEAM. <br /><span className="text-gradient">ANY SIZE.</span></h2>
            <div className="space-y-6">
              {[
                { title: "Engineering Teams", role: "Sprint planning, bug tracking, and sub-50ms real-time collaboration tools." },
                { title: "Agency Directors", role: "Multi-workspace isolation to manage diverse client portfolios with precision." },
                { title: "Product Architects", role: "Visual Gantt roadmaps and portfolio health analytics for delivery confidence." },
              ].map((team, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="flex gap-6 p-8 glass-card rounded-[2rem] border border-white/10 hover:border-primary/20 group"
                >
                  <div className="mt-1 flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-950 dark:text-white text-lg mb-2 tracking-tight">{team.title}</h4>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">{team.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </FadeIn>

          <div className="lg:w-1/2 relative">
            <div className="aspect-square bg-gradient-to-tr from-primary to-blue-600 rounded-[4rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(139,92,246,0.4)] p-5 group">
              <Image
                src="/subhero.jpg"
                alt="Team collaboration"
                width={800}
                height={800}
                className="object-cover h-full w-full rounded-[3rem] group-hover:scale-[1.03] transition-transform duration-700"
              />
            </div>
            {/* Floating overlay card */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-8 -left-8 glass p-6 rounded-[2rem] shadow-2xl border border-white/20 max-w-xs hidden sm:block"
            >
              <div className="flex -space-x-3 mb-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="w-12 h-12 rounded-full border-2 border-white bg-primary/20" />)}
                <div className="w-12 h-12 rounded-full border-2 border-white bg-primary flex items-center justify-center text-white text-xs font-black">+46</div>
              </div>
              <p className="text-sm font-black text-slate-950 dark:text-white tracking-tight">450+ Teams Synchronized</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Growing 32% month over month.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-32 sm:py-48 overflow-hidden">
        <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60" />
        <div className="absolute top-0 left-0 -z-10 w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            {/* Bento grid */}
            <div className="order-2 lg:order-1 grid grid-cols-2 gap-5">
              <div className="space-y-5 pt-14">
                <div className="aspect-[4/3] glass-card rounded-[2.5rem] p-10 flex flex-col justify-end border border-white/20 group hover:border-primary/20">
                  <span className="text-5xl font-black text-gradient tracking-tighter">350%</span>
                  <p className="text-sm font-black text-slate-600 dark:text-slate-400 mt-3 uppercase tracking-widest">Efficiency Gain</p>
                </div>
                <div className="aspect-[4/5] bg-slate-950 rounded-[2.5rem] p-10 flex flex-col justify-center border border-white/5 group">
                  <Quote className="w-12 h-12 text-primary mb-6 opacity-60 group-hover:opacity-100 transition-opacity" />
                  <p className="text-2xl font-black text-white leading-tight tracking-tight italic">&quot;The velocity is unlike anything we&apos;ve experienced.&quot;</p>
                </div>
              </div>
              <div className="space-y-5">
                <div className="aspect-square bg-primary rounded-[2.5rem] p-10 text-white flex flex-col justify-center items-center text-center shadow-[0_30px_60px_-15px_rgba(139,92,246,0.4)] group hover:scale-[1.02] transition-transform">
                  <Shield className="w-16 h-16 mb-6 group-hover:scale-110 transition-transform" />
                  <p className="text-xl font-black uppercase tracking-tighter">Atomic Security</p>
                </div>
                <div className="aspect-[4/3] glass-card rounded-[2.5rem] p-10 flex flex-col justify-center border border-white/10">
                  <p className="text-slate-950 dark:text-white font-black mb-6 uppercase tracking-[0.2em] text-xs">Integrations</p>
                  <div className="flex gap-5">
                    <Slack className="w-9 h-9 text-primary/60 hover:text-primary transition-colors" />
                    <Calendar className="w-9 h-9 text-primary/60 hover:text-primary transition-colors" />
                    <Database className="w-9 h-9 text-primary/60 hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            </div>

            <FadeIn className="order-1 lg:order-2">
              <h2 className="text-5xl sm:text-7xl font-black text-slate-950 dark:text-white mb-12 leading-[0.9] tracking-tighter">WHY <span className="text-gradient">THETA</span>?</h2>
              <div className="space-y-12">
                {[
                  { label: "Extreme Velocity", body: "Built on Next.js App Router and Ably, Theta delivers near-instant response times. Zero loading spinners. Zero friction in your backlog management flow." },
                  { label: "Atomic Isolation", body: "Our multi-tenant architecture uses strictly isolated patterns to ensure your data stays logically separate — even on shared infrastructure." },
                  { label: "Predictable Cost", body: "No hidden fees. A Free tier that lets you ship. A Lifetime plan that turns Theta into a permanent team asset, not a recurring drain." },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.6 }}
                    className="border-l-2 border-primary/30 pl-8 hover:border-primary transition-colors duration-300"
                  >
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white mb-4 uppercase tracking-tighter">{item.label}</h3>
                    <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{item.body}</p>
                  </motion.div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-6 py-32 sm:py-48">
        <div className="text-center mb-24">
          <FadeIn>
            <h2 className="text-5xl sm:text-7xl font-black text-slate-950 dark:text-white mb-8 tracking-tighter">LOVED BY <span className="text-gradient">BUILDERS.</span></h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 font-medium">Theta is trusted by teams building the future.</p>
          </FadeIn>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              name: "Sarah Chen",
              role: "CTO @ Fluxio",
              content: "The real-time collaboration is flawless. We moved our entire 40-person engineering team in one afternoon. The multi-tenant isolation gives us the privacy we need for client projects."
            },
            {
              name: "Marcus Thorne",
              role: "CEO @ Brightside",
              content: "We switched from Jira last month and haven't looked back. Theta is just faster. The UI is gorgeous, and our project managers are actually completing tasks on time now."
            },
            {
              name: "Lina Rodriguez",
              role: "Lead Designer @ PixelPerfect",
              content: "Theta feels like it was designed by people who actually use project tools. Clean, minimalist, but packed with features. The lifetime plan was a no-brainer."
            },
          ].map((t, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="p-10 glass-card rounded-[3rem] border border-white/10 hover:border-primary/20 flex flex-col justify-between h-full group transition-all duration-500">
                <div>
                  <div className="flex gap-1.5 mb-8">
                    {[1, 2, 3, 4, 5].map(j => <Star key={j} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-lg text-slate-700 dark:text-slate-300 italic leading-relaxed font-medium mb-10">&quot;{t.content}&quot;</p>
                </div>
                <div className="flex items-center gap-5 border-t border-white/5 pt-8">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors" />
                  <div>
                    <h4 className="font-black text-slate-950 dark:text-white tracking-tight">{t.name}</h4>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">{t.role}</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-6 py-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative bg-primary rounded-[4rem] p-16 sm:p-24 text-center text-white overflow-hidden shadow-[0_40px_80px_-20px_rgba(139,92,246,0.5)] group"
        >
          {/* Background mesh */}
          <div className="absolute inset-0 mesh-gradient opacity-30" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent_60%)]" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white/10 text-white text-[10px] font-black uppercase tracking-[0.3em] mb-12 border border-white/20 backdrop-blur-xl">
              <Sparkles className="w-3.5 h-3.5" /> Initialize Your Protocol
            </div>
            <h2 className="text-5xl sm:text-8xl font-black mb-10 leading-[0.85] tracking-tighter">ELEVATE YOUR <br />TEAM VELOCITY.</h2>
            <p className="text-xl sm:text-2xl mb-16 text-white/80 max-w-2xl mx-auto leading-relaxed font-medium">
              2,400+ teams already synchronized. Your workspace is 30 seconds away.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <SignUpButton mode="modal">
                <Button size="lg" className="h-20 px-16 bg-white text-primary hover:bg-white/90 w-full sm:w-auto font-black uppercase tracking-[0.15em] text-sm rounded-[2rem] shadow-2xl hover:scale-[1.04] active:scale-95 transition-all duration-500">
                  Initialize Free
                </Button>
              </SignUpButton>
              <Link href="/pricing" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="h-20 px-16 border-white/30 hover:bg-white/10 text-white w-full sm:w-auto font-black uppercase tracking-[0.15em] text-sm rounded-[2rem] transition-all duration-500 backdrop-blur-md hover:border-white/60">
                  Full Protocol
                </Button>
              </Link>
            </div>
          </div>

          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px]" />
          <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px]" />
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-slate-950" />
        <div className="absolute inset-0 mesh-gradient opacity-15" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 mb-24">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-3 mb-8">
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-2xl border border-primary/20">
                  <Image src="/Logo.png" alt="Theta Logo" fill className="object-cover" />
                </div>
                <span className="text-3xl font-black text-gradient tracking-tighter">Theta</span>
              </div>
              <p className="text-slate-500 text-base leading-relaxed max-w-xs mb-10 font-medium">
                Building the most intelligent, feature-complete project synchronization platform for modern teams.
              </p>
              <div className="flex gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="w-12 h-12 rounded-2xl glass border border-white/10 flex items-center justify-center hover:border-primary/30 hover:scale-110 transition-all duration-300 cursor-pointer" />)}
              </div>
            </div>

            <div className="hidden lg:block" />

            {[
              { label: "Protocol", links: [["Features", "#features"], ["Pricing", "/pricing"], ["Integrations", "#"], ["Roadmap", "#"]] },
              { label: "Company", links: [["About", "#"], ["Careers", "#"], ["Blog", "#"], ["Contact", "#"]] },
              { label: "Resources", links: [["Docs", "/docs"], ["API Reference", "#"], ["Help Center", "#"], ["Status", "#"]] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-black text-white mb-8 uppercase tracking-[0.2em] text-[10px]">{col.label}</h4>
                <ul className="space-y-5">
                  {col.links.map(([name, href], j) => (
                    <li key={j}>
                      {href.startsWith("/") ? (
                        <Link href={href} className="text-slate-500 font-medium hover:text-primary transition-colors text-sm">{name}</Link>
                      ) : (
                        <a href={href} className="text-slate-500 font-medium hover:text-primary transition-colors text-sm">{name}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-10 border-t border-white/5 text-slate-600 text-xs font-black uppercase tracking-[0.2em]">
            <p>&copy; 2026 Theta Systems. Built by Pioneers.</p>
            <div className="flex gap-8">
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Protocol</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
              <Link href="/docs" className="hover:text-primary transition-colors">Documentation</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
