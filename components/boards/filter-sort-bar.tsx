"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import {
  Search, Filter, SortAsc, SortDesc, X, Save, Eye, EyeOff,
  ArrowUpDown, Tag, Flag, Calendar, User, Clock,
  Plus, SlidersHorizontal, Columns3, ChevronDown
} from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useStatuses, useWorkspaceStatuses, getStatusValue, FALLBACK_STATUSES } from "@/hooks/use-statuses";

export type SortConfig = {
  field: string;
  direction: "asc" | "desc";
};

export type FilterConfig = {
  priority?: string | null;
  tagIds?: string[];
  assigneeId?: string | null;
  status?: string | null;
  dateRange?: { from?: string; to?: string } | null;
  search?: string;
};

export type ColumnVisibility = Record<string, boolean>;

export type SavedView = {
  id: string;
  name: string;
  filterConfig: FilterConfig;
  sortConfig: SortConfig | null;
  columnVisibility: ColumnVisibility;
};

interface FilterSortBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterConfig: FilterConfig;
  onFilterChange: (config: FilterConfig) => void;
  sortConfig: SortConfig | null;
  onSortChange: (config: SortConfig | null) => void;
  columns: { id: string; name: string; columnType?: string }[];
  columnVisibility: ColumnVisibility;
  onColumnVisibilityChange: (vis: ColumnVisibility) => void;
  allTags: { id: string; name: string; color: string }[];
  savedViews: SavedView[];
  onSaveView: (name: string) => void;
  onLoadView: (view: SavedView) => void;
  onDeleteView: (id: string) => void;
  totalTasks: number;
  filteredCount: number;
  projectId?: string | null;
}

const SORT_FIELDS = [
  { id: "title", label: "Title", icon: Tag },
  { id: "priority", label: "Priority", icon: Flag },
  { id: "dueDate", label: "Due Date", icon: Calendar },
  { id: "status", label: "Status", icon: Clock },
  { id: "createdAt", label: "Created", icon: Plus },
  { id: "assignee", label: "Assignee", icon: User },
];

export default function FilterSortBar({
  searchQuery, onSearchChange,
  filterConfig, onFilterChange,
  sortConfig, onSortChange,
  columns, columnVisibility, onColumnVisibilityChange,
  allTags, savedViews, onSaveView, onLoadView, onDeleteView,
  totalTasks, filteredCount, projectId,
}: FilterSortBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showSaveView, setShowSaveView] = useState(false);
  const [showLoadView, setShowLoadView] = useState(false);
  const [savedViewName, setSavedViewName] = useState("");

  const { activeWorkspaceId } = useWorkspace();
  const { data: dbStatuses } = useStatuses(activeWorkspaceId, projectId);
  const statuses = (dbStatuses && dbStatuses.length > 0 ? dbStatuses : FALLBACK_STATUSES).map(s => ({
      id: getStatusValue(s.name),
      name: s.name,
  }));

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterConfig.priority && filterConfig.priority !== "all") count++;
    if (filterConfig.tagIds && filterConfig.tagIds.length > 0) count++;
    if (filterConfig.assigneeId) count++;
    if (filterConfig.status) count++;
    if (filterConfig.dateRange) count++;
    return count;
  }, [filterConfig]);

  const clearFilters = () => {
    onFilterChange({});
    onSearchChange("");
    onSortChange(null);
  };

  return (
    <div className="flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-9 pr-8 text-xs rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Filter Button */}
      <Popover open={showFilters} onOpenChange={setShowFilters}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn(
            "h-8 text-[10px] font-bold gap-1.5 rounded-xl border-slate-200 dark:border-slate-700",
            activeFilterCount > 0 && "border-primary text-primary bg-muted dark:bg-primary/10"
          )}>
            <Filter className="h-3 w-3" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="h-4 min-w-4 px-1 text-[8px] bg-primary ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-4 rounded-2xl shadow-xl border-slate-200 dark:border-slate-800">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500">Filters</h4>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-500">Priority</label>
              <Select
                value={filterConfig.priority || "all"}
                onValueChange={(v) => onFilterChange({ ...filterConfig, priority: v === "all" ? null : v })}
              >
                <SelectTrigger className="h-8 text-xs rounded-xl">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Priorities</SelectItem>
                  <SelectItem value="high" className="text-xs">High</SelectItem>
                  <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                  <SelectItem value="low" className="text-xs">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-500">Tags</label>
              <div className="flex flex-wrap gap-1">
                {allTags.map((tag) => {
                  const isSelected = filterConfig.tagIds?.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        const current = filterConfig.tagIds || [];
                        const next = isSelected
                          ? current.filter((id) => id !== tag.id)
                          : [...current, tag.id];
                        onFilterChange({ ...filterConfig, tagIds: next });
                      }}
                      className={cn(
                        "text-[9px] font-bold px-2 py-1 rounded-full border transition-all ",
                        isSelected
                          ? "border-current text-white"
                          : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
                      )}
                      style={isSelected ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                    >
                      {tag.name}
                    </button>
                  );
                })}
                {allTags.length === 0 && (
                  <span className="text-[10px] text-slate-400 italic">No tags</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-500">Status</label>
              <Select
                value={filterConfig.status || "all"}
                onValueChange={(v) => onFilterChange({ ...filterConfig, status: v === "all" ? null : v })}
              >
                <SelectTrigger className="h-8 text-xs rounded-xl">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full h-8 text-[10px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
              >
                <X className="h-3 w-3 mr-1" /> Clear all filters
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort Button */}
      <Popover open={showSort} onOpenChange={setShowSort}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn(
            "h-8 text-[10px] font-bold gap-1.5 rounded-xl border-slate-200 dark:border-slate-700",
            sortConfig && "border-primary text-primary bg-muted dark:bg-primary/10"
          )}>
            <ArrowUpDown className="h-3 w-3" />
            Sort
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 p-4 rounded-2xl shadow-xl">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500">Sort By</h4>
            <div className="space-y-1">
              {SORT_FIELDS.map((field) => {
                const Icon = field.icon;
                const isActive = sortConfig?.field === field.id;
                return (
                  <button
                    key={field.id}
                    onClick={() => {
                      if (isActive) {
                        if (sortConfig?.direction === "asc") {
                          onSortChange({ field: field.id, direction: "desc" });
                        } else {
                          onSortChange(null);
                        }
                      } else {
                        onSortChange({ field: field.id, direction: "asc" });
                      }
                      setShowSort(false);
                    }}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs transition-colors",
                      isActive
                        ? "bg-muted dark:bg-primary/10 text-primary font-semibold"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {field.label}
                    </span>
                    {isActive && (
                      sortConfig?.direction === "asc"
                        ? <SortAsc className="h-3.5 w-3.5" />
                        : <SortDesc className="h-3.5 w-3.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Columns Button */}
      <Popover open={showColumns} onOpenChange={setShowColumns}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold gap-1.5 rounded-xl border-slate-200 dark:border-slate-700">
            <Columns3 className="h-3 w-3" />
            Columns
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-4 rounded-2xl shadow-xl">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 mb-2">Column Visibility</h4>
            {columns.map((col) => {
              const visible = columnVisibility[col.id] !== false;
              return (
                <button
                  key={col.id}
                  onClick={() => onColumnVisibilityChange({
                    ...columnVisibility,
                    [col.id]: !visible,
                  })}
                  className="flex items-center justify-between w-full px-3 py-1.5 rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span className="text-slate-600">{col.name}</span>
                  {visible ? (
                    <Eye className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-slate-300" />
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6 bg-slate-200 dark:bg-slate-700" />

      {/* Saved Views */}
      <Popover open={showSaveView} onOpenChange={setShowSaveView}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold gap-1.5 rounded-xl">
            <Save className="h-3 w-3" />
            Save
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-4 rounded-2xl shadow-xl">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500">Save Current View</h4>
            <div className="flex gap-2">
              <Input
                placeholder="View name..."
                value={savedViewName}
                onChange={(e) => setSavedViewName(e.target.value)}
                className="h-8 text-xs rounded-xl flex-1"
              />
              <Button
                size="sm"
                className="h-8 text-[10px] rounded-xl"
                disabled={!savedViewName.trim()}
                onClick={() => {
                  onSaveView(savedViewName.trim());
                  setSavedViewName("");
                  setShowSaveView(false);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={showLoadView} onOpenChange={setShowLoadView}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold gap-1.5 rounded-xl">
            <SlidersHorizontal className="h-3 w-3" />
            Views
            {savedViews.length > 0 && (
              <Badge className="h-4 min-w-4 px-1 text-[8px] bg-slate-400 ml-0.5">{savedViews.length}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-4 rounded-2xl shadow-xl">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 mb-1">Saved Views</h4>
            {savedViews.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic">No saved views yet</p>
            ) : (
              savedViews.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 group"
                >
                  <button
                    className="flex-1 text-left text-xs font-medium text-slate-600"
                    onClick={() => { onLoadView(view); setShowLoadView(false); }}
                  >
                    {view.name}
                  </button>
                  <button
                    onClick={() => onDeleteView(view.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex-1" />

      {/* Results count */}
      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
        {filteredCount} / {totalTasks} tasks
      </span>
    </div>
  );
}
