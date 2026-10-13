import React, { forwardRef } from 'react';

export const Textarea = forwardRef(({
  label,
  error,
  helperText,
  maxLength,
  value,
  className = '',
  containerClassName = '',
  id,
  rows = 4,
  ...props
}, ref) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
      <div className="flex items-center justify-between">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        {maxLength && (
          <span className="text-[11px] text-slate-400 font-mono">
            {currentLength}/{maxLength}
          </span>
        )}
      </div>

      <textarea
        id={textareaId}
        ref={ref}
        rows={rows}
        maxLength={maxLength}
        value={value}
        className={`w-full rounded-xl border bg-white dark:bg-slate-900/80 p-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
          error
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-950'
            : 'border-slate-300 dark:border-slate-700 focus:border-teal-600 focus:ring-teal-100 dark:focus:ring-teal-950'
        } ${className}`}
        {...props}
      />

      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
});

Textarea.displayName = 'Textarea';
