import React from 'react';

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-10 w-full rounded-2xl" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-soft flex flex-col gap-3">
      <Skeleton className="h-8 w-full rounded-lg mb-2" />
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
          {[...Array(cols)].map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}
