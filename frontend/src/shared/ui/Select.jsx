import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(({
  label,
  error,
  options = [],
  children,
  className = '',
  containerClassName = '',
  id,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          ref={ref}
          className={`w-full appearance-none rounded-xl border bg-white dark:bg-slate-900/80 px-4 py-2.5 pr-10 text-sm text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-950'
              : 'border-slate-300 dark:border-slate-700 focus:border-teal-600 focus:ring-teal-100 dark:focus:ring-teal-950'
          } ${className}`}
          {...props}
        >
          {options.length > 0
            ? options.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
