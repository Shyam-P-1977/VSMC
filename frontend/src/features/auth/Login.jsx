import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, UserCog, Users, Wrench } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { apiError } from '../../api/client'
import { ROLE_HOME } from '../../lib/format'
import { emailRule, validate } from '../../lib/validators'
import { Button, Input, Logo } from '../../components/ui'

const DEMOS = [
  ['Admin', 'admin@vscms.com', 'Admin@123', UserCog],
  ['Mechanic', 'mech1@vscms.com', 'Mech@123', Wrench],
  ['Customer', 'cust1@vscms.com', 'Cust@123', Users],
]

export function AuthFrame({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-night-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="hero-grid absolute inset-0" />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-brand-500/30 blur-[110px]" />
        <Link to="/" className="relative"><Logo light /></Link>
        <div className="relative">
          <h2 className="text-4xl font-extrabold leading-tight">Your car, <span className="text-brand-400">in expert hands.</span></h2>
          <p className="mt-4 max-w-md text-slate-300">Book services, watch every step of the repair, and pay when it's done — all from one place.</p>
        </div>
        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} VSCMS Auto Care</p>
      </div>
      <div className="flex flex-col justify-center px-4 py-10 sm:px-12">
        <Link to="/" className="mb-8 lg:hidden"><Logo /></Link>
        <div className="mx-auto w-full max-w-md animate-fade-up">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-6 text-center text-sm text-muted">{footer}</div>
          <p className="mt-6 text-center text-xs text-muted"><Link to="/help" className="text-brand-600 hover:underline">Need help? Visit the FAQ</Link></p>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const { user, login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate(form, { email: emailRule, password: (v) => (v ? '' : 'Password is required') })
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    setFormError('')
    try {
      const u = await login(form.email.trim(), form.password)
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`)
      nav(loc.state?.from && loc.state.from.startsWith('/' + u.role) ? loc.state.from : ROLE_HOME[u.role], { replace: true })
    } catch (err) {
      setFormError(apiError(err))
    } finally { setBusy(false) }
  }

  return (
    <AuthFrame title="Welcome back" subtitle="Log in to manage your vehicle services."
      footer={<>New here? <Link to="/register" className="font-semibold text-brand-600 hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {formError && <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 ring-1 ring-red-500/30" role="alert">{formError}</div>}
        <Input id="login-email" label="Email" type="email" autoComplete="email" value={form.email} error={errors.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input 
          id="login-password" 
          label="Password" 
          type={show ? 'text' : 'password'} 
          autoComplete="current-password" 
          value={form.password} 
          error={errors.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} 
          endIcon={<button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>}
        />
        <Button id="login-submit" type="submit" loading={busy} className="w-full !py-3">Log in</Button>
      </form>

      <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface-2/50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Demo accounts (click to fill)</p>
        <div className="flex flex-wrap gap-2">
          {DEMOS.map(([role, email, password, Icon]) => (
            <button key={role} type="button" onClick={() => { setForm({ email, password }); setErrors({}); setFormError('') }}
              className="flex-1 min-w-[120px] rounded-xl border border-line bg-surface p-2.5 text-left text-xs transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-sm">
              <span className="flex items-center gap-1.5 font-semibold text-ink"><Icon className="h-3.5 w-3.5 text-brand-600" />{role}</span>
              <span className="mt-1 block truncate text-muted text-[11px]">{email}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthFrame>
  )
}
