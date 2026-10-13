import React from 'react';

export function Card({
  children,
  className = '',
  hoverEffect = false,
  variant = 'default',
  ...props
}) {
  const variantStyles = {
    default: "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-soft",
    teal: "bg-teal-900 text-white border border-teal-800 shadow-soft-lg",
    band: "bg-[#F3F5F5] dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800",
    gradient: "bg-gradient-to-br from-teal-900 to-teal-950 text-white border border-teal-800 shadow-soft-lg",
    yellow: "bg-yellow-tint border border-yellow-signal/40 text-ink shadow-soft",
  };

  const hoverStyle = hoverEffect
    ? "transition-all duration-200 hover:-translate-y-1 hover:shadow-soft-lg"
    : "";

  return (
    <div
      className={`rounded-2xl md:rounded-3xl p-5 md:p-6 ${variantStyles[variant] || variantStyles.default} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType = 'positive', // 'positive', 'neutral', 'negative'
  color = 'teal',
  className = ''
}) {
  const colorStyles = {
    teal: "bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300",
    yellow: "bg-yellow-tint dark:bg-yellow-signal/20 text-ink dark:text-yellow-signal",
    blue: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300",
    rose: "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300",
  };

  return (
    <Card hoverEffect className={`relative overflow-hidden ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-3xl font-bold font-mono tracking-tight mt-1 text-slate-900 dark:text-white">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
          {trend && (
            <span className={`inline-flex items-center text-xs font-semibold mt-2.5 ${
              trendType === 'positive' ? 'text-emerald-600 dark:text-emerald-400' :
              trendType === 'negative' ? 'text-rose-600 dark:text-rose-400' :
              'text-slate-500'
            }`}>
              {trend}
            </span>
          )}
        </div>

        {Icon && (
          <div className={`p-3 rounded-2xl ${colorStyles[color] || colorStyles.teal}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </Card>
  );
}
