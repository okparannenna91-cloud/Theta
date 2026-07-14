"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardDescription, CardContent } from "@/components/ui/card";
import { Star, Sparkles, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/ui/logo";
import HeroSection from "@/components/landing/sections/hero-section";
import ProblemSection from "@/components/landing/sections/problem-section";
import MeetNovaSection from "@/components/landing/sections/meet-nova-section";
import HowItWorksSection from "@/components/landing/sections/how-it-works-section";
import EcosystemSection from "@/components/landing/sections/ecosystem-section";
import DifferentiatorsSection from "@/components/landing/sections/differentiators-section";
import NovaInActionSection from "@/components/landing/sections/nova-in-action-section";
import IdeaToDeliverySection from "@/components/landing/sections/idea-to-delivery-section";
import BuiltForTeamsSection from "@/components/landing/sections/built-for-teams-section";
import SecuritySection from "@/components/landing/sections/security-section";
import PricingFaqSection from "@/components/landing/sections/pricing-faq-section";
import FinalCtaSection from "@/components/landing/sections/final-cta-section";

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
          <Logo size="lg" />

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground mr-10">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">Process</a>
            <a href="#teams" className="hover:text-foreground transition-colors">Teams</a>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </div>

          <div className="flex gap-3 items-center">
            <Link href="/sign-in">
              <Button variant="ghost" className="hidden sm:inline-flex text-sm h-10 px-5 rounded-lg">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-10 px-5 rounded-lg shadow-sm">
                Get Started <Zap className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <HeroSection />
      <ProblemSection />
      <MeetNovaSection />
      <HowItWorksSection />
      <EcosystemSection />
      <DifferentiatorsSection />
      <NovaInActionSection />
      <IdeaToDeliverySection />
      <BuiltForTeamsSection />
      <SecuritySection />
      <PricingFaqSection />
      <FinalCtaSection />

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

      <footer className="border-t py-16 bg-card">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-10 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <Logo size="lg" className="mb-6" />
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
            <p>&copy; {new Date().getFullYear()} Theta Systems.</p>
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
