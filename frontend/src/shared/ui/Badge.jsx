import React from 'react';

export function Badge({
  children,
  variant = 'teal',
  size = 'md',
  className = '',
  icon: Icon
}) {
  const variantStyles = {
    teal: "bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-950/80 dark:text-teal-200 dark:border-teal-800",
    yellow: "bg-yellow-tint text-ink border-yellow-signal/50 dark:bg-yellow-signal/20 dark:text-yellow-signal dark:border-yellow-signal/40",
    gray: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    rose: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800",
    amber: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800",
    emerald: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800",
    blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-800",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2"
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${variantStyles[variant] || variantStyles.teal} ${sizeStyles[size] || sizeStyles.md} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className = "" }) {
  // Pending Approval=amber, Accepted=teal, Rejected=red, others unchanged
  const configs = {
    'Pending Approval': {
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-800',
      dot: 'bg-amber-500'
    },
    'Accepted': {
      bg: 'bg-teal-50 dark:bg-teal-950/50',
      text: 'text-teal-800 dark:text-teal-200',
      border: 'border-teal-300 dark:border-teal-700',
      dot: 'bg-teal-600'
    },
    'Rejected': {
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      text: 'text-rose-800 dark:text-rose-300',
      border: 'border-rose-300 dark:border-rose-800',
      dot: 'bg-rose-500'
    },
    'Pending': {
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-800',
      dot: 'bg-amber-500'
    },
    'Assigned': {
      bg: 'bg-blue-50 dark:bg-blue-950/50',
      text: 'text-blue-800 dark:text-blue-300',
      border: 'border-blue-300 dark:border-blue-800',
      dot: 'bg-blue-500'
    },
    'In Progress': {
      bg: 'bg-teal-50 dark:bg-teal-950/50',
      text: 'text-teal-800 dark:text-teal-200',
      border: 'border-teal-300 dark:border-teal-700',
      dot: 'bg-teal-600'
    },
    'Awaiting Parts': {
      bg: 'bg-orange-50 dark:bg-orange-950/50',
      text: 'text-orange-800 dark:text-orange-300',
      border: 'border-orange-300 dark:border-orange-800',
      dot: 'bg-orange-500'
    },
    'Completed': {
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      text: 'text-emerald-800 dark:text-emerald-300',
      border: 'border-emerald-300 dark:border-emerald-800',
      dot: 'bg-emerald-500'
    },
    'Cancelled': {
      bg: 'bg-slate-100 dark:bg-slate-800/60',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-300 dark:border-slate-700',
      dot: 'bg-slate-400'
    },
    'Unpaid': {
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      text: 'text-rose-800 dark:text-rose-300',
      border: 'border-rose-300 dark:border-rose-800',
      dot: 'bg-rose-500'
    },
    'Paid': {
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      text: 'text-emerald-800 dark:text-emerald-300',
      border: 'border-emerald-300 dark:border-emerald-800',
      dot: 'bg-emerald-500'
    }
  };

  const style = configs[status] || configs['Cancelled'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />
      {status}
    </span>
  );
}
