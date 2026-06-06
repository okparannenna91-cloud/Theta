"use client";

import React, { useState, useEffect } from "react";
import {
  FileText, ArrowRight, Search, ListChecks, AlertTriangle,
  Target, GitBranch, Info, BookOpen, FileOutput, Zap
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DocumentTypeDef {
  type: string;
  description: string;
}

interface DocumentAction {
  name: string;
  description: string;
}

interface DocumentSectionData {
  documentTypes: DocumentTypeDef[];
  actions: DocumentAction[];
  pipeline: string[];
  linkTypes: string[];
}

const DOC_ICONS: Record<string, React.ElementType> = {
  PRD: Target,
  TECHNICAL_SPEC: GitBranch,
  MEETING_NOTES: BookOpen,
  SOP: ListChecks,
  KNOWLEDGE_ARTICLE: Info,
  PROJECT_BRIEF: FileText,
  RETROSPECTIVE: AlertTriangle,
  RESEARCH_REPORT: FileOutput,
  TEAM_DOCUMENTATION: BookOpen,
  GENERAL: FileText,
};

const DOC_COLORS: Record<string, string> = {
  PRD: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  TECHNICAL_SPEC: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  MEETING_NOTES: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  SOP: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  KNOWLEDGE_ARTICLE: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  PROJECT_BRIEF: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  RETROSPECTIVE: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  RESEARCH_REPORT: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  TEAM_DOCUMENTATION: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  GENERAL: "text-muted-foreground bg-muted border-border",
};

export function DocumentDashboard() {
  const [data, setData] = useState<DocumentSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"types" | "actions" | "pipeline">("types");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/ai/constitution?section=11")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          documentTypes: s?.documentTypes || [],
          actions: s?.actions || [],
          pipeline: s?.pipeline || [],
          linkTypes: s?.linkTypes || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="space-y-4 text-center">
          <Skeleton className="h-10 w-10 rounded-lg mx-auto" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  const filteredDocs = data?.documentTypes.filter(d =>
    d.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Document Intelligence</h1>
            <p className="text-sm text-muted-foreground">Section 11 — Nova Document Capabilities</p>
          </div>
        </div>
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search document types..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["types", "actions", "pipeline"] as const).map(tab => (
          <Badge
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            className="cursor-pointer text-xs rounded-md px-3 py-1 flex items-center gap-1.5"
            onClick={() => setActiveTab(tab)}
          >
            {tab === "types" && <FileText className="w-3 h-3" />}
            {tab === "actions" && <Zap className="w-3 h-3" />}
            {tab === "pipeline" && <ArrowRight className="w-3 h-3" />}
            {tab}
          </Badge>
        ))}
      </div>

      {activeTab === "types" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc, i) => {
            const Icon = DOC_ICONS[doc.type] || FileText;
            const colorClass = DOC_COLORS[doc.type] || "text-muted-foreground bg-muted border-border";
            return (
              <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border", colorClass)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{doc.type.replace(/_/g, " ")}</CardTitle>
                      <CardDescription className="text-xs">{doc.type}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{doc.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "actions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.actions.map((a, i) => (
            <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">{a.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{a.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "pipeline" && (
        <div className="relative">
          {data?.pipeline.map((step, i) => (
            <div key={i} className="flex items-start gap-4 pb-8 last:pb-0 relative">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">{i + 1}</span>
                </div>
                {i < (data?.pipeline.length || 1) - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm text-muted-foreground">{step}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.linkTypes && data.linkTypes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground">Workspace Link Types</h3>
          <div className="flex flex-wrap gap-2">
            {data.linkTypes.map((link, i) => (
              <Badge key={i} variant="outline" className="text-xs rounded-md px-3 py-1">
                {link}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
