export const inr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0))

export const fmtDate = (d) => {
  if (!d) return '-'
  const dt = typeof d === 'string' && d.length === 10 ? new Date(d + 'T00:00:00') : new Date(d)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'

export const timeAgo = (d) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export const isoDate = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const STATUS_STYLES = {
  Pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30',
  Assigned: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-blue-500/30',
  'In Progress': 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-indigo-500/30',
  'Awaiting Parts': 'bg-orange-500/15 text-orange-700 dark:text-orange-300 ring-orange-500/30',
  Completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30',
  Cancelled: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 ring-slate-500/30',
  Unpaid: 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30',
  Paid: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30',
  Success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30',
  Failed: 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30',
}

export const STATUS_DOT = {
  Pending: 'bg-amber-500', Assigned: 'bg-blue-500', 'In Progress': 'bg-indigo-500', 'Awaiting Parts': 'bg-orange-500',
  Completed: 'bg-emerald-500', Cancelled: 'bg-slate-400',
}

export const ROLE_HOME = { customer: '/customer', admin: '/admin', mechanic: '/mechanic' }

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const openHtml = (html, print = false) => {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(html)
  w.document.close()
  if (print) setTimeout(() => w.print(), 400)
  return true
}
