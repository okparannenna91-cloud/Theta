"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileText, Plus, Search, MoreHorizontal,
  Edit3, Trash2, Copy, Star, Clock,
  Share2, Lock, Globe, Users
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface DocsViewProps {
  workspaceId: string;
}

interface DocItem {
  id: string;
  title: string;
  emoji: string;
  isPinned: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DocsView({ workspaceId }: DocsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [docs, setDocs] = useState<DocItem[]>([]);

  const filtered = docs.filter(d =>
    !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinned = filtered.filter(d => d.isPinned);
  const unpinned = filtered.filter(d => !d.isPinned);

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">Docs</h3>
          <p className="text-xs text-muted-foreground">{docs.length} documents</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search docs..."
              className="h-8 pl-8 w-48 text-xs rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5">
            <Plus className="h-3 w-3" /> New Doc
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-4 space-y-8">
        {pinned.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pinned</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pinned.map((doc) => (
                <DocCard key={doc.id} doc={doc} />
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-3 w-3 text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">All Documents</span>
          </div>

          {unpinned.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {unpinned.map((doc) => (
                <DocCard key={doc.id} doc={doc} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No documents yet</p>
              <p className="text-xs mt-1">Create your first document to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocCard({ doc }: { doc: DocItem }) {
  return (
    <Card className="group border shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all cursor-pointer">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <span className="text-2xl">{doc.emoji}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-36">
              <DropdownMenuItem className="text-xs gap-2"><Edit3 className="h-3 w-3" /> Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2"><Copy className="h-3 w-3" /> Duplicate</DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2"><Share2 className="h-3 w-3" /> Share</DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2 text-red-500"><Trash2 className="h-3 w-3" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <h4 className="text-sm font-semibold mb-2 group-hover:text-indigo-600 transition-colors">{doc.title}</h4>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
          </span>
          {doc.isPublic ? (
            <Globe className="h-3 w-3 text-emerald-500" />
          ) : (
            <Lock className="h-3 w-3 text-slate-400" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
