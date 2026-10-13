import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  error,
  helperText,
  icon: Icon,
  endIcon: EndIcon,
  onEndIconClick,
  className = '',
  containerClassName = '',
  id,
  type = 'text',
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          ref={ref}
          type={type}
          className={`w-full rounded-xl border bg-white dark:bg-slate-900/80 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
            Icon ? 'pl-10' : ''
          } ${
            EndIcon ? 'pr-10' : ''
          } ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-950'
              : 'border-slate-300 dark:border-slate-700 focus:border-teal-600 focus:ring-teal-100 dark:focus:ring-teal-950'
          } ${className}`}
          {...props}
        />

        {EndIcon && (
          <div
            onClick={onEndIconClick}
            className={`absolute right-3.5 text-slate-400 ${
              onEndIconClick ? 'cursor-pointer hover:text-slate-600 dark:hover:text-slate-200' : 'pointer-events-none'
            }`}
          >
            <EndIcon className="w-4 h-4" />
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
