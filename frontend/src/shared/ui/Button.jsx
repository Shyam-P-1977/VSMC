import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseClasses = "inline-flex items-center justify-center font-semibold transition-all duration-200 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

  const variantClasses = {
    primary: "bg-yellow-signal text-ink hover:bg-yellow-hover shadow-sm hover:shadow rounded-full font-bold",
    teal: "bg-teal-900 text-white hover:bg-teal-800 shadow-sm rounded-full",
    outline: "border-2 border-teal-700 dark:border-teal-400 text-teal-900 dark:text-teal-100 hover:bg-teal-50 dark:hover:bg-teal-950/50 rounded-full",
    secondary: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm rounded-full",
    ghost: "bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg",
  };

  const sizeClasses = {
    sm: "px-3.5 py-1.5 text-xs gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-7 py-3 text-base gap-2.5",
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
}
