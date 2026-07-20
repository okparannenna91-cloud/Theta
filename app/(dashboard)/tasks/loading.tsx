export default function TasksLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="h-4 w-4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="flex-1" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-6 w-6 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
