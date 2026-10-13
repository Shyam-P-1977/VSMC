import React from 'react';
import { StatusBadge } from './Badge';

export function Timeline({ events = [], className = '' }) {
  if (!events || events.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic">No timeline history recorded yet.</p>
    );
  }

  return (
    <div className={`relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 ${className}`}>
      {events.map((event, idx) => {
        const isLatest = idx === events.length - 1;

        return (
          <div key={event.History_ID || idx} className="relative group">
            {/* Timeline Dot */}
            <div
              className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                isLatest
                  ? 'bg-yellow-signal ring-4 ring-yellow-signal/20 animate-pulse'
                  : 'bg-teal-700 dark:bg-teal-400'
              }`}
            />

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={event.Status} />
                <span className="text-[11px] text-slate-400 font-mono">
                  {event.Timestamp ? new Date(event.Timestamp).toLocaleString() : ''}
                </span>
                {event.Changed_By_Name && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    by {event.Changed_By_Name}
                  </span>
                )}
              </div>

              {event.Note && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  {event.Note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
