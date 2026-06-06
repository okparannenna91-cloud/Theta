"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserButton } from "@clerk/nextjs";
import { User as UserIcon, Shield, Zap, Target } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and personal settings
        </p>
      </div>

      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="scale-150">
                <UserButton />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Account Details</h2>
                <p className="text-sm text-muted-foreground">Manage your identity and authentication</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    <Shield className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-600">Verified</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <Zap className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-medium text-amber-600">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border shadow-sm hover:border-primary/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Personal Information</h3>
                  <p className="text-xs text-muted-foreground">Update your name, email, and avatar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:border-primary/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Preferences</h3>
                  <p className="text-xs text-muted-foreground">Configure your work preferences</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center pt-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-muted/30">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Account active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
