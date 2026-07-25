"use client";

import { useState } from "react";
import { Save, Trash2, ChevronDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SavedView {
  id: string;
  name: string;
  config: Record<string, any>;
}

interface CalendarSavedViewsProps {
  savedViews: SavedView[];
  activeViewId: string | null;
  onSaveView: (name: string) => void;
  onLoadView: (id: string) => void;
  onDeleteView: (id: string) => void;
  currentConfig: Record<string, any>;
}

export function CalendarSavedViews({
  savedViews,
  activeViewId,
  onSaveView,
  onLoadView,
  onDeleteView,
  currentConfig,
}: CalendarSavedViewsProps) {
  const [saveName, setSaveName] = useState("");
  const [isSaveOpen, setIsSaveOpen] = useState(false);

  const handleSave = () => {
    if (!saveName.trim()) return;
    onSaveView(saveName.trim());
    setSaveName("");
    setIsSaveOpen(false);
  };

  return (
    <div className="flex items-center gap-1">
      <Popover open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-md px-2.5 gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Save View
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 rounded-lg" align="end">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Save current view</p>
            <Input
              placeholder="View name..."
              className="h-8 text-xs"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              autoFocus
            />
            <div className="flex justify-end gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsSaveOpen(false)}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={!saveName.trim()}>Save</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {savedViews.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-md px-2.5 gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              {activeViewId ? savedViews.find(v => v.id === activeViewId)?.name || "Saved Views" : "Saved Views"}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-lg" align="end">
            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Saved Views
            </div>
            <DropdownMenuSeparator />
            {savedViews.map((view) => (
              <DropdownMenuItem
                key={view.id}
                className={`flex items-center justify-between text-xs py-1.5 ${activeViewId === view.id ? "bg-primary/10" : ""}`}
                onClick={() => onLoadView(view.id)}
              >
                <span className="truncate">{view.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteView(view.id); }}
                  className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}