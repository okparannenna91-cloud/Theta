"use client";

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

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = value === 18500 ? 18.5 : value;
    const step = target / 30;
    let current = 0;
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        setDisplayValue(target);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.round(current));
      }
    }, 50);
    return () => clearInterval(interval);
  }, [value]);

  return (
    <span className="text-5xl md:text-7xl font-bold text-foreground tracking-tight tabular-nums">
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
    <section className="relative py-20 border-y bg-muted/30">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: "Active Users", value: stats.activeUsers, suffix: "+" },
          { label: "Synced Tasks", value: stats.dailyTasks, suffix: "k" },
          { label: "Uptime SLA", value: stats.uptimeSLA, suffix: "%" },
          { label: "Clusters", value: stats.teamWorkspaces, suffix: "" },
        ].map((stat, i) => (
          <div key={i} className="flex flex-col items-center lg:items-start space-y-2">
            <AnimatedNumber value={stat.value === 18500 ? 18.5 : stat.value} suffix={stat.suffix} />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Theta PM",
    "operatingSystem": "Web",
    "applicationCategory": "ProjectManagementApplication",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "2400"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden border">
              <Image src="/Logo.png" alt="Theta Logo" fill className="object-cover" />
            </div>
            <span className="text-xl font-semibold text-foreground">
              Theta
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground mr-10">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">Process</a>
            <a href="#teams" className="hover:text-foreground transition-colors">Team</a>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </div>

          <div className="flex gap-3 items-center">
            <SignInButton mode="modal">
              <Button variant="ghost" className="hidden sm:inline-flex text-sm h-10 px-5 rounded-lg">
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-10 px-5 rounded-lg shadow-sm">
                Get Started <Zap className="w-4 h-4 ml-1.5" />
              </Button>
            </SignUpButton>
          </div>
        </div>
      </nav>

      <section className="relative min-h-[90vh] flex items-center justify-center pt-24">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-8 border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" /> Keeping Teams Connected
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold mb-6 leading-[1.1] tracking-tight text-foreground">
              Orchestrate <br />
              <span className="text-primary">Flow.</span>
            </h1>

            <p className="text-lg lg:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The next evolution of project collaboration. Smart, beautiful, and built for high-velocity teams.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <SignUpButton mode="modal">
                <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm text-sm font-medium">
                  Get Started Free
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </SignUpButton>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="h-12 px-8 rounded-lg text-sm font-medium">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <StatsSection />

      <section id="features" className="max-w-7xl mx-auto px-6 py-24 sm:py-32">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">Engineered for <span className="text-primary">Velocity</span></h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every interaction is fine-tuned to help your team ship faster while maintaining absolute structural integrity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Zap, title: "Instant Live Updates", description: "Experience near-instant task updates and collaborative live boards powered by Ably." },
            { icon: BarChart3, title: "Deep Analytics", description: "Visualize project roadmaps with high-fidelity Gantt charts and performance timelines." },
            { icon: Layers, title: "Portfolio Health", description: "Strategic dashboard to monitor all projects and overall organizational health at a glance." },
            { icon: Shield, title: "Private Workspaces", description: "Enterprise-grade workspace separation ensures your data stays private and secure." },
            { icon: Users, title: "Rapid Onboarding", description: "Seamlessly integrate team members with secure, tokenized invite links and role-based access." },
            { icon: Database, title: "Dynamic Automations", description: "Set up complex triggers to automate repetitive tasks and cross-workspace status updates." },
          ].map((feature, i) => (
            <Card key={i} className="border shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base font-semibold">{feature.title}</CardTitle>
                <CardDescription className="text-sm">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-20 relative bg-card rounded-xl border p-8 sm:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-4 block">Professional Grade Suite</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight tracking-tight">Master Every Project.</h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Theta goes beyond basic task management. Every feature is engineered for world-class PMO workflows — from strategic portfolio views to precision time logging.
              </p>
              <div className="space-y-5">
                {[
                  { t: "Strategic Portfolio Tracking", d: "A bird's-eye view of all workspace projects with real-time health indicators." },
                  { t: "Precision Gantt & Timelines", d: "Manage complex dependencies and long-term roadmaps with interactive charts." },
                  { t: "Task-Level Time Logging", d: "Log every second of work with our integrated task-level stopwatch precision timer." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-0.5">{item.t}</h4>
                      <p className="text-sm text-muted-foreground">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-sm">
              <div className="rounded-lg border bg-background shadow-sm overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 bg-muted/50 border-b">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <div className="ml-4 h-3 w-24 bg-muted-foreground/20 rounded" />
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-20 bg-muted-foreground/20 rounded" />
                    <div className="h-3 w-12 bg-muted-foreground/10 rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-muted rounded overflow-hidden">
                      <div className="h-full w-2/3 bg-primary rounded" />
                    </div>
                    <div className="h-2 w-full bg-muted rounded overflow-hidden">
                      <div className="h-full w-1/3 bg-emerald-500 rounded" />
                    </div>
                    <div className="h-2 w-full bg-muted rounded overflow-hidden">
                      <div className="h-full w-4/5 bg-blue-500 rounded" />
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 pt-2">
                    {Array.from({ length: 21 }).map((_, i) => (
                      <div key={i} className={`h-10 rounded-md ${i % 3 === 0 ? 'bg-primary/20 border border-primary/30' : 'bg-muted'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="nova-ai" className="py-24 sm:py-32 bg-muted/30 border-y">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            <div className="lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6 border border-primary/20">
                <Cpu className="w-3.5 h-3.5" /> AI Assistant
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 leading-tight tracking-tight">
                Meet <span className="text-primary">Nova</span>, Your Co-Pilot.
              </h2>
              <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                Nova is a deeply integrated intelligence layer within your workspace, transcending traditional chatbots to provide automatic project help.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Wand2, title: "AI Content Creation", desc: "Create project plans and documentation in seconds." },
                  { icon: Brain, title: "Strategic Insight", desc: "Access high-level brainstorming and roadmapping on demand." },
                  { icon: MessageSquare, title: "Smart Context", desc: "Nova understands how everything in your workspace is connected." },
                  { icon: Zap, title: "Fluid Efficiency", desc: "Automate complex workflows with natural language commands." },
                ].map((item, i) => (
                  <Card key={i} className="border shadow-sm hover:border-primary/30 transition-all">
                    <CardHeader>
                      <item.icon className="w-5 h-5 text-primary mb-2" />
                      <CardTitle className="text-sm font-semibold">{item.title}</CardTitle>
                      <CardDescription className="text-sm">{item.desc}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>

            <div className="lg:w-1/2 relative w-full max-w-md">
              <Card className="border shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-lg">✨</div>
                    <div>
                      <CardTitle className="text-sm font-semibold">Nova AI</CardTitle>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <p className="text-xs text-muted-foreground">Connected</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-start">
                    <div className="bg-muted text-muted-foreground p-4 rounded-lg rounded-tl-none max-w-[85%] text-sm leading-relaxed">
                      Operational. I&apos;ve analyzed the current project. Shall we start organizing the project?
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground p-4 rounded-lg rounded-tr-none max-w-[85%] text-sm">
                      Optimize the dashboard architecture for high-density multi-tenant layouts.
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-muted text-muted-foreground p-4 rounded-lg rounded-tl-none max-w-[85%] text-sm">
                      <p className="font-semibold text-primary mb-2 text-xs uppercase tracking-wider">Completed:</p>
                      <ul className="space-y-1.5">
                        {["Deploy modern layout layers", "Adjust layout spacing", "Update real-time team state"].map((li, i) => (
                          <li key={i} className="flex gap-2 items-center text-xs">
                            <span className="w-1 h-1 rounded-full bg-primary" />
                            {li}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto mb-16 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">Ready <span className="text-primary">in Seconds.</span></h2>
            <p className="text-lg text-muted-foreground">Friction eliminated. Go from zero to working in three simple steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Setup Workspace", desc: "Sign up and set up your private workspace in the secure Theta cloud." },
              { step: "02", title: "Invite Your Team", desc: "Create secure invite links and assign different roles with specific access settings." },
              { step: "03", title: "Start Working", desc: "Collaborate with instant live boards, live task updates, and workspace-level intelligence." },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary mb-6 border border-primary/20">
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="teams" className="max-w-7xl mx-auto px-6 py-24 sm:py-32">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-center">
          <div className="lg:w-1/2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6 border border-primary/20">
              <Users className="w-3.5 h-3.5" /> Built for Every Team
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-8 leading-tight tracking-tight">Your Team. <span className="text-primary">Any Size.</span></h2>
            <div className="space-y-4">
              {[
                { title: "Engineering Teams", role: "Sprint planning, bug tracking, and real-time collaboration tools." },
                { title: "Agency Directors", role: "Separate workspaces to manage diverse client portfolios easily." },
                { title: "Product Architects", role: "Visual Gantt roadmaps and project health analytics for delivery confidence." },
              ].map((team, i) => (
                <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
                  <CardHeader className="flex flex-row items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{team.title}</CardTitle>
                      <CardDescription className="text-sm">{team.role}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          <div className="lg:w-1/2">
            <div className="aspect-square rounded-xl overflow-hidden border shadow-sm">
              <Image
                src="/subhero.jpg"
                alt="Team collaboration"
                width={800}
                height={800}
                className="object-cover h-full w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32 bg-muted/30 border-y">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-10">
                <div className="aspect-[4/3] rounded-xl border shadow-sm p-6 flex flex-col justify-end bg-card">
                  <span className="text-4xl font-bold text-primary tracking-tight">350%</span>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">Efficiency Gain</p>
                </div>
                <div className="aspect-[4/5] rounded-xl border shadow-sm p-6 flex flex-col justify-center bg-card">
                  <Quote className="w-8 h-8 text-primary mb-4" />
                  <p className="text-lg font-semibold text-foreground leading-snug tracking-tight italic">&quot;The velocity is unlike anything we&apos;ve experienced.&quot;</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="aspect-square rounded-xl border shadow-sm p-6 flex flex-col justify-center items-center text-center bg-primary text-primary-foreground">
                  <Shield className="w-10 h-10 mb-4" />
                  <p className="text-sm font-semibold">Secure & Private</p>
                </div>
                <div className="aspect-[4/3] rounded-xl border shadow-sm p-6 flex flex-col justify-center bg-card">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Integrations</p>
                  <div className="flex gap-4">
                    <Slack className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />
                    <Calendar className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />
                    <Database className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-8 leading-tight tracking-tight">Why <span className="text-primary">Theta</span>?</h2>
              <div className="space-y-8">
                {[
                  { label: "High Speed", body: "Built on Next.js and Ably, Theta delivers near-instant response times. No more waiting." },
                  { label: "Private Workspaces", body: "Our secure platform uses strictly isolated patterns to ensure your data stays private — even on shared infrastructure." },
                  { label: "Simple Pricing", body: "No hidden fees. A Free tier that lets you start. A Lifetime plan that turns Theta into a permanent team asset." },
                ].map((item, i) => (
                  <div key={i} className="border-l-2 border-primary/30 pl-6 hover:border-primary transition-colors">
                    <h3 className="text-lg font-semibold text-foreground mb-2">{item.label}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-24 sm:py-32">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">Loved by <span className="text-primary">Builders.</span></h2>
          <p className="text-lg text-muted-foreground">Theta is trusted by teams building the future.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              name: "Sarah Chen",
              role: "CTO @ Fluxio",
              content: "The real-time collaboration is flawless. We moved our entire 40-person engineering team in one afternoon."
            },
            {
              name: "Marcus Thorne",
              role: "CEO @ Brightside",
              content: "We switched from Jira last month and haven't looked back. Theta is just faster. The UI is gorgeous."
            },
            {
              name: "Lina Rodriguez",
              role: "Lead Designer @ PixelPerfect",
              content: "Theta feels like it was designed by people who actually use project tools. Clean, minimalist, but packed with features."
            },
          ].map((t, i) => (
            <Card key={i} className="border shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
              <CardHeader>
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(j => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <CardDescription className="text-sm leading-relaxed italic">
                  &quot;{t.content}&quot;
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex items-center gap-3 border-t pt-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {t.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="relative bg-primary rounded-xl p-12 sm:p-16 text-center text-primary-foreground overflow-hidden shadow-sm">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground text-xs font-medium mb-8 border border-primary-foreground/20">
              <Sparkles className="w-3.5 h-3.5" /> Start Your Journey
            </div>
            <h2 className="text-4xl sm:text-6xl font-bold mb-4 leading-tight tracking-tight">Speed Up Your Team Workflow.</h2>
            <p className="text-lg mb-10 text-primary-foreground/80 max-w-xl mx-auto">
              2,400+ teams already connected. Your workspace is 30 seconds away.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <SignUpButton mode="modal">
                <Button size="lg" className="h-12 px-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-lg text-sm font-medium shadow-sm">
                  Start for Free
                </Button>
              </SignUpButton>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="h-12 px-8 border-primary-foreground/30 hover:bg-primary-foreground/10 text-primary-foreground rounded-lg text-sm font-medium">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-16 bg-card">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-10 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden border">
                  <Image src="/Logo.png" alt="Theta Logo" fill className="object-cover" />
                </div>
                <span className="text-xl font-semibold text-foreground">Theta</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-8">
                Building the most intelligent, feature-complete project collaboration platform for modern teams.
              </p>
            </div>

            {[
              { label: "Platform", links: [["Features", "#features"], ["Pricing", "/pricing"], ["Integrations", "#"], ["Roadmap", "#"]] },
              { label: "Company", links: [["About", "#"], ["Careers", "#"], ["Blog", "#"], ["Contact", "#"]] },
              { label: "Resources", links: [["Docs", "/docs"], ["API Reference", "#"], ["Help Center", "#"], ["Status", "#"]] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">{col.label}</h4>
                <ul className="space-y-3">
                  {col.links.map(([name, href], j) => (
                    <li key={j}>
                      {href.startsWith("/") ? (
                        <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{name}</Link>
                      ) : (
                        <a href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{name}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t text-xs text-muted-foreground">
            <p>&copy; 2026 Theta Systems.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
