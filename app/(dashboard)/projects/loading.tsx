export default function ProjectsLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-9 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-5 w-5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="flex justify-between mt-4">
              <div className="h-3 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
