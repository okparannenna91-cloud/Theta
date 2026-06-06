"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileText, Image, FileSpreadsheet, File as FileIcon,
  Download, Trash2, Eye, Share2, Upload, Search,
  FolderOpen, MoreHorizontal, Clock, User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface FilesViewProps {
  tasks: any[];
  workspaceId: string;
}

const FILE_ICONS: Record<string, any> = {
  image: Image, pdf: FileText, spreadsheet: FileSpreadsheet,
  doc: FileText, default: FileIcon
};

function getFileIcon(type: string) {
  if (type?.startsWith("image")) return FILE_ICONS.image;
  if (type?.includes("pdf")) return FILE_ICONS.pdf;
  if (type?.includes("sheet") || type?.includes("excel")) return FILE_ICONS.spreadsheet;
  if (type?.includes("document") || type?.includes("word")) return FILE_ICONS.doc;
  return FILE_ICONS.default;
}

function getFileType(file: any) {
  if (file.type?.startsWith("image")) return "Image";
  if (file.type?.includes("pdf")) return "PDF";
  if (file.type?.includes("sheet") || file.type?.includes("excel")) return "Spreadsheet";
  if (file.type?.includes("word") || file.type?.includes("document")) return "Document";
  return "File";
}

export default function FilesView({ tasks, workspaceId }: FilesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const allFiles = tasks
    .filter(t => t.attachments)
    .flatMap(t => {
      const attachments = typeof t.attachments === "string"
        ? JSON.parse(t.attachments)
        : t.attachments;
      return (Array.isArray(attachments) ? attachments : []).map((a: any) => ({
        ...a,
        taskTitle: t.title,
        taskId: t.id,
      }));
    })
    .filter(f => !searchQuery || f.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">Files</h3>
          <p className="text-xs text-muted-foreground">{allFiles.length} files across {tasks.length} items</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search files..."
              className="h-8 pl-8 w-48 text-xs rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("px-2 py-1 rounded text-[10px] font-bold", viewMode === "grid" && "bg-white dark:bg-slate-800 shadow-sm")}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("px-2 py-1 rounded text-[10px] font-bold", viewMode === "list" && "bg-white dark:bg-slate-800 shadow-sm")}
            >
              List
            </button>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5">
            <Upload className="h-3 w-3" /> Upload
          </Button>
        </div>
      </div>

      {allFiles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">No files yet</p>
            <p className="text-xs mt-1">Upload files to your tasks to see them here</p>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allFiles.map((file: any, i: number) => {
            const Icon = getFileIcon(file.type);
            return (
              <Card key={i} className="group border shadow-sm hover:shadow-md transition-all overflow-hidden">
                <div className="aspect-[4/3] bg-slate-50 dark:bg-slate-900 flex items-center justify-center relative">
                  {file.type?.startsWith("image") ? (
                    <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-12 w-12 text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white rounded-full">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white rounded-full">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">{getFileType(file)}</Badge>
                    {file.size && (
                      <span className="text-[9px] text-slate-400">{Math.round(file.size / 1024)}KB</span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 truncate">from: {file.taskTitle}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-slate-50 dark:bg-slate-900">
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500">Name</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500">Type</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500">Size</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500">From Task</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allFiles.map((file: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {React.createElement(getFileIcon(file.type), { className: "h-4 w-4 text-slate-400" })}
                      <span className="text-xs font-medium">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{getFileType(file)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{file.size ? `${Math.round(file.size / 1024)}KB` : "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{file.taskTitle}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3 w-3 text-red-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
