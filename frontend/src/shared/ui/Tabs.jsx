import React from 'react';

export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
  variant = 'pill' // 'pill' or 'underline'
}) {
  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto pb-1 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        if (variant === 'underline') {
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-yellow-signal text-teal-900 dark:text-yellow-signal font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  isActive ? 'bg-yellow-signal text-ink font-mono' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              isActive
                ? 'bg-teal-900 text-white dark:bg-yellow-signal dark:text-ink shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                isActive
                  ? 'bg-white/20 dark:bg-ink/20 text-current'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
