"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserButton } from "@clerk/nextjs";

import { MotionWrapper, FadeIn } from "@/components/common/motion-wrapper";
import { User, Shield, Zap, Target } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 relative selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Neural Mesh Background */}
      <div className="absolute top-0 left-0 -z-10 w-[800px] h-[800px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-0 -z-10 w-[600px] h-[600px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />

      <MotionWrapper className="p-8 sm:p-12 lg:p-20 max-w-5xl mx-auto relative z-10">
        <div className="mb-20">
          <h1 className="text-6xl sm:text-7xl font-black tracking-tighter mb-6 uppercase leading-none">
            Identity <span className="text-indigo-600">Core</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="h-1 w-20 bg-indigo-600 rounded-full" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">
              Manage your neural credentials and system authorization.
            </p>
          </div>
        </div>

        <div className="space-y-12 pb-40">
          <FadeIn delay={0.1}>
            <div className="glass-card border-none rounded-[3rem] overflow-hidden bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10 sm:p-16">
              <div className="flex flex-col lg:flex-row items-center gap-12">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-indigo-600/20 rounded-full blur-2xl group-hover:bg-indigo-600/40 transition-all duration-700 opacity-0 group-hover:opacity-100" />
                  <div className="relative scale-150 sm:scale-[2] lg:scale-[2.5] transform">
                    <UserButton />
                  </div>
                </div>
                
                <div className="space-y-6 flex-1 text-center lg:text-left">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Neural Link established</h2>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Identity synchronized with Theta Grid</p>
                  </div>
                  
                  <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                    <div className="flex items-center gap-3 bg-white/40 dark:bg-slate-900/40 px-6 py-3 rounded-2xl border border-indigo-500/10">
                      <Shield className="h-4 w-4 text-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Auth Verified</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/40 dark:bg-slate-900/40 px-6 py-3 rounded-2xl border border-indigo-500/10">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Alpha Access</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <FadeIn delay={0.2}>
              <Card className="glass-card border-none rounded-[2.5rem] bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10 hover:shadow-2xl transition-all duration-700 group">
                <div className="space-y-6">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-600/5 flex items-center justify-center border border-indigo-500/10 group-hover:scale-110 transition-transform">
                    <User className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase tracking-tighter">System Signature</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Modify your public node identifier and operational avatar.</p>
                  </div>
                </div>
              </Card>
            </FadeIn>

            <FadeIn delay={0.3}>
              <Card className="glass-card border-none rounded-[2.5rem] bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10 hover:shadow-2xl transition-all duration-700 group">
                <div className="space-y-6">
                  <div className="h-14 w-14 rounded-2xl bg-purple-600/5 flex items-center justify-center border border-purple-500/10 group-hover:scale-110 transition-transform">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Mission Control</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Configure your personal synchronization targets and work preferences.</p>
                  </div>
                </div>
              </Card>
            </FadeIn>
          </div>

          <div className="flex justify-center pt-20">
             <div className="flex items-center gap-4 bg-slate-100/50 dark:bg-slate-900/50 px-8 py-3 rounded-full border border-indigo-500/5 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em]">
                  Profile synchronized with neural identity core v1.0.8
                </p>
             </div>
           </div>
        </div>
      </MotionWrapper>
    </div>
  );
}

