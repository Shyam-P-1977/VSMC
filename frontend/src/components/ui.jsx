import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { STATUS_DOT, STATUS_STYLES, fmtDateTime } from '../lib/format'

export const cx = (...a) => a.filter(Boolean).join(' ')

export function Spinner({ className = 'h-4 w-4' }) {
  return <Loader2 className={cx('animate-spin', className)} aria-hidden />
}

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={cx('skeleton', className)} aria-hidden />
}

export function Card({ className, children, ...props }) {
  return (
    <div className={cx('card', className)} {...props}>
      {children}
    </div>
  )
}

export function SkeletonCards({ n = 3, className = 'h-28' }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => <Skeleton key={i} className={cx('rounded-2xl', className)} />)}
    </div>
  )
}

export function SkeletonRows({ n = 5 }) {
  return (
    <div className="space-y-3 p-4" role="status" aria-label="Loading">
      {Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  )
}

export function StatusBadge({ status, dot = true }) {
  return (
    <span className={cx('badge ring-1 ring-inset whitespace-nowrap', STATUS_STYLES[status] || 'bg-surface-2 text-muted ring-line')}>
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', STATUS_DOT[status] || 'bg-current')} />}
      {status}
    </span>
  )
}

export function Field({ error, hint, children }) {
  return (
    <div className="flex flex-col gap-1">
      {children}
      {error ? <p className="text-xs font-medium text-red-500 animate-fade-up" role="alert">{error}</p>
        : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

export function Input({ label, error, hint, required, className, endIcon, ...p }) {
  return (
    <Field error={error} hint={hint}>
      <div className="floating-container">
        <input className={cx('input peer', endIcon && 'pr-10', error && 'input-error', className)} placeholder=" " aria-invalid={!!error} required={required} {...p} />
        <label className={cx('floating-label', error && 'floating-label-error')}>
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {endIcon && <div className="absolute right-3 top-4 text-muted hover:text-ink cursor-pointer z-20">{endIcon}</div>}
      </div>
    </Field>
  )
}

export function Select({ label, error, hint, required, children, className, ...p }) {
  return (
    <Field error={error} hint={hint}>
      <div className="floating-container">
        <select className={cx('input peer', error && 'input-error', className)} aria-invalid={!!error} required={required} {...p}>
          <option value="" disabled hidden></option>
          {children}
        </select>
        <label className={cx('floating-label', error && 'floating-label-error')}>
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>
    </Field>
  )
}

export function Textarea({ label, error, hint, required, className, ...p }) {
  return (
    <Field error={error} hint={hint}>
      <div className="floating-container">
        <textarea className={cx('input min-h-[96px] peer', error && 'input-error', className)} placeholder=" " aria-invalid={!!error} required={required} {...p} />
        <label className={cx('floating-label', error && 'floating-label-error')}>
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>
    </Field>
  )
}

export function Avatar({ src, name, size = 'md' }) {
  const sz = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-base' }[size]
  return src ? (
    <img src={src} alt={name} className={cx("rounded-full object-cover shadow-sm", sz)} />
  ) : (
    <div className={cx("flex items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold uppercase shadow-sm", sz)}>
      {name?.slice(0, 2) || '?'}
    </div>
  )
}

export function Tooltip({ children, content }) {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="whitespace-nowrap rounded-md bg-ink px-2.5 py-1 text-xs text-bg shadow-md">
          {content}
          <div className="absolute left-1/2 top-full -mt-0.5 -translate-x-1/2 border-4 border-transparent border-t-ink"></div>
        </div>
      </div>
    </div>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex space-x-1 rounded-xl bg-surface-2 p-1 max-w-fit">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cx(
            'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
            active === tab.id
              ? 'bg-surface text-brand-600 shadow-sm'
              : 'text-muted hover:text-ink hover:bg-surface-2/80'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({ steps, current }) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, idx) => {
        const isActive = idx === current
        const isPast = idx < current
        return (
          <div key={idx} className="flex items-center w-full last:w-auto">
            <div className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold text-sm transition-colors", 
              isActive ? "bg-brand-500 text-white shadow-md ring-4 ring-brand-50" : 
              isPast ? "bg-emerald-500 text-white" : "bg-surface-2 text-muted")}>
              {idx + 1}
            </div>
            {idx !== steps.length - 1 && (
              <div className={cx("mx-2 h-1 w-full rounded-full transition-colors", isPast ? "bg-emerald-500" : "bg-line")} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function Button({ variant = 'primary', loading, children, className, size, ...p }) {
  return (
    <button className={cx(`btn-${variant}`, size === 'sm' && 'btn-sm', className)} disabled={loading || p.disabled} {...p}>
      {loading && <Spinner />}{children}
    </button>
  )
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  const w = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size]
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-night-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cx('card relative flex max-h-[92vh] w-full flex-col animate-pop rounded-b-none sm:rounded-b-2xl', w)}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="btn-ghost btn-sm !p-1.5" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmText = 'Confirm', danger, loading, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Back</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmText}</Button>
      </>}>
      <div className="flex gap-3">
        {danger && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
        <p className="text-sm text-muted">{message}</p>
      </div>
    </Modal>
  )
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Icon className="h-8 w-8" /></div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-red-500" />
      <p className="text-sm text-muted">{message || 'Something went wrong.'}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const TONES = {
  brand: 'from-brand-500 to-brand-700',
  amber: 'from-amber-400 to-orange-500',
  indigo: 'from-indigo-500 to-violet-600',
  emerald: 'from-emerald-400 to-teal-600',
  red: 'from-rose-500 to-red-600',
}

export function StatCard({ icon: Icon, label, value, tone = 'brand', to, hint }) {
  const body = (
    <div className={cx('card p-5 animate-fade-up', to && 'card-hover')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        <div className={cx('grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md', TONES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

export function Pagination({ page, pages, total, onChange }) {
  if (!pages || pages <= 1) return total != null ? <p className="px-4 py-3 text-xs text-muted">{total} record{total === 1 ? '' : 's'}</p> : null
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3">
      <p className="text-xs text-muted">Page {page} of {pages}{total != null && ` · ${total} records`}</p>
      <div className="flex gap-1">
        <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

export function Timeline({ items }) {
  return (
    <ol className="relative ml-3 border-l-2 border-line">
      {items.map((t, i) => {
        const last = i === items.length - 1
        return (
          <li key={t.id} className="mb-5 ml-6 last:mb-0">
            <span className={cx('absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 border-surface', STATUS_DOT[t.status] || 'bg-slate-400', last && 'ring-4 ring-brand-500/25')} />
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={t.status} dot={false} />
              <span className="text-xs text-muted">{fmtDateTime(t.timestamp)}</span>
            </div>
            {t.note && <p className="mt-1 text-sm text-muted">{t.note}</p>}
            {t.changed_by && <p className="text-xs text-muted/80">by {t.changed_by}</p>}
          </li>
        )
      })}
    </ol>
  )
}

export function Logo({ className = '', light }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-lg">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M4 14l1.8-4.6A2 2 0 017.7 8h8.6a2 2 0 011.9 1.4L20 14v5h-2.5v-1.5h-11V19H4v-5zm3.2 1.2a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4zm9.6 0a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4z" /></svg>
      </span>
      <span className={cx('font-display text-lg font-bold tracking-tight', light ? 'text-white' : 'text-ink')}>VSCMS<span className="text-brand-500">.</span></span>
    </span>
  )
}
