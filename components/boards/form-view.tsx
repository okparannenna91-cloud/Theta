"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileText, Plus, Search, ExternalLink,
  Copy, Eye, Trash2, ToggleLeft,
  Users, Globe, Lock, Clock, CheckCircle2,
  AlertCircle, Settings
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";

interface FormViewProps {
  workspaceId: string;
}

interface FormItem {
  id: string;
  title: string;
  description: string;
  isPublic: boolean;
  responseCount: number;
  fields: number;
  createdAt: string;
  updatedAt: string;
}

export default function FormView({ workspaceId }: FormViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewForm, setPreviewForm] = useState<FormItem | null>(null);

  const [forms] = useState<FormItem[]>([
    { id: "1", title: "Client Onboarding", description: "New client intake form", isPublic: true, responseCount: 23, fields: 8, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "2", title: "Bug Report", description: "Report a bug in the system", isPublic: true, responseCount: 45, fields: 6, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "3", title: "Feature Request", description: "Suggest a new feature", isPublic: false, responseCount: 12, fields: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ]);

  const filtered = forms.filter(f =>
    !searchQuery || f.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">Forms</h3>
          <p className="text-xs text-muted-foreground">{forms.length} forms · {forms.reduce((s, f) => s + f.responseCount, 0)} total responses</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search forms..."
              className="h-8 pl-8 w-48 text-xs rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5">
            <Plus className="h-3 w-3" /> New Form
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-4">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((form) => (
              <Card key={form.id} className="group border shadow-sm hover:shadow-lg hover:border-indigo-500/30 transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => setPreviewForm(form)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold mb-1">{form.title}</h4>
                  <p className="text-xs text-muted-foreground mb-4">{form.description}</p>

                  <div className="flex items-center gap-3 text-[10px] text-slate-400 mb-4">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {form.fields} fields
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {form.responseCount} responses
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {form.isPublic ? (
                        <Globe className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Lock className="h-3 w-3 text-slate-400" />
                      )}
                      <span className="text-[9px] text-slate-400">
                        {form.isPublic ? "Public" : "Private"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(form.updatedAt), { addSuffix: true })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-slate-400">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No forms yet</p>
            <p className="text-xs mt-1">Create a form to start collecting data</p>
          </div>
        )}
      </div>

      <Dialog open={!!previewForm} onOpenChange={() => setPreviewForm(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{previewForm?.title}</DialogTitle>
            <DialogDescription>{previewForm?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Full Name</label>
              <Input placeholder="Enter your name" className="h-10 rounded-lg" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email</label>
              <Input type="email" placeholder="Enter your email" className="h-10 rounded-lg" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Message</label>
              <textarea
                className="w-full min-h-[100px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="Enter your message"
              />
            </div>
            <Button className="w-full">Submit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
