import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { apiError, apiFieldErrors } from '../../api/client'
import { ROLE_HOME } from '../../lib/format'
import { contactRule, emailRule, passwordRule, req, validate } from '../../lib/validators'
import { Button, Input, cx } from '../../components/ui'
import { AuthFrame } from './Login'

function PasswordStrength({ password }) {
  if (!password) return null
  let score = 0
  if (password.length > 7) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600']
  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
  const c = colors[score] || colors[0]
  
  return (
    <div className="mt-2 space-y-1.5 animate-fade-up">
      <div className="flex gap-1 h-1">
        {[0,1,2,3].map(i => (
          <div key={i} className={cx("flex-1 rounded-full transition-colors", i < score ? c : "bg-line")} />
        ))}
      </div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted text-right">
        {labels[score] || labels[0]}
      </p>
    </div>
  )
}

export default function Register() {
  const { user, register } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', contact: '', password: '', confirm: '', address: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showConf, setShowConf] = useState(false)

  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate(f, {
      name: (v) => (req('Name')(v) || (v.trim().length < 2 ? 'Name is too short' : '')),
      email: emailRule, contact: contactRule, password: passwordRule,
      confirm: (v, all) => (v !== all.password ? 'Passwords do not match' : ''),
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      await register({ name: f.name, email: f.email, contact: f.contact, password: f.password, address: f.address })
      toast.success('Account created! Add your first vehicle to get started.')
      nav('/customer/vehicles', { replace: true })
    } catch (err) {
      const fe = apiFieldErrors(err)
      if (Object.keys(fe).length) setErrors(fe)
      else toast.error(apiError(err))
    } finally { setBusy(false) }
  }

  return (
    <AuthFrame title="Create your account" subtitle="Takes less than a minute. Customers only — staff accounts are created by the admin."
      footer={<>Already registered? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input id="reg-name" label="Full name" required value={f.name} onChange={set('name')} error={errors.name} autoComplete="name" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="reg-email" label="Email" type="email" required value={f.email} onChange={set('email')} error={errors.email} autoComplete="email" />
          <Input id="reg-contact" label="Contact (10 digits)" required inputMode="numeric" maxLength={10} value={f.contact} onChange={set('contact')} error={errors.contact} autoComplete="tel" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Input id="reg-password" label="Password" type={showPwd ? 'text' : 'password'} required value={f.password} onChange={set('password')} error={errors.password} autoComplete="new-password" 
              endIcon={<button type="button" onClick={() => setShowPwd(!showPwd)} aria-label={showPwd ? 'Hide' : 'Show'}>{showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}
            />
            <PasswordStrength password={f.password} />
          </div>
          <div>
            <Input id="reg-confirm" label="Confirm password" type={showConf ? 'text' : 'password'} required value={f.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password"
              endIcon={<button type="button" onClick={() => setShowConf(!showConf)} aria-label={showConf ? 'Hide' : 'Show'}>{showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}
            />
          </div>
        </div>
        <Input id="reg-address" label="Address (optional)" value={f.address} onChange={set('address')} />
        <Button id="reg-submit" type="submit" loading={busy} className="w-full !py-3 mt-2">Create account</Button>
      </form>
    </AuthFrame>
  )
}
