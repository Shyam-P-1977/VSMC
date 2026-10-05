import { useState } from 'react'
import toast from 'react-hot-toast'
import * as api from '../../api'
import { apiError, apiFieldErrors } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { contactRule, passwordRule, req, validate } from '../../lib/validators'
import { Button, Input, PageHeader, StatusBadge } from '../../components/ui'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [f, setF] = useState({ name: user.name, contact: user.contact, address: user.address || '' })
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' })
  const [e1, setE1] = useState({})
  const [e2, setE2] = useState({})
  const [b1, setB1] = useState(false)
  const [b2, setB2] = useState(false)

  const saveProfile = async (ev) => {
    ev.preventDefault()
    const errs = validate(f, { name: req('Name'), contact: contactRule })
    setE1(errs)
    if (Object.keys(errs).length) return
    setB1(true)
    try {
      const d = await api.auth.updateProfile(f)
      setUser(d.user)
      toast.success('Profile updated')
    } catch (err) {
      setE1(apiFieldErrors(err))
      toast.error(apiError(err))
    } finally { setB1(false) }
  }

  const savePw = async (ev) => {
    ev.preventDefault()
    const errs = validate(pw, {
      current_password: req('Current password'),
      new_password: passwordRule,
      confirm: (v, all) => (v !== all.new_password ? 'Passwords do not match' : ''),
    })
    setE2(errs)
    if (Object.keys(errs).length) return
    setB2(true)
    try {
      await api.auth.updateProfile({ current_password: pw.current_password, new_password: pw.new_password })
      setPw({ current_password: '', new_password: '', confirm: '' })
      toast.success('Password changed')
    } catch (err) {
      setE2(apiFieldErrors(err))
      toast.error(apiError(err))
    } finally { setB2(false) }
  }

  return (
    <>
      <PageHeader title="My Profile" subtitle="Manage your personal details and password." />
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="card space-y-4 p-6" noValidate>
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 font-display text-xl font-bold text-white">{user.name[0]}</div>
            <div><p className="font-semibold">{user.email}</p><span className="mt-1 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-brand-700">{user.role}</span></div>
          </div>
          <Input id="profile-name" label="Full name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={e1.name} />
          <Input id="profile-contact" label="Contact number" required value={f.contact} maxLength={10} onChange={(e) => setF({ ...f, contact: e.target.value })} error={e1.contact} />
          <Input id="profile-address" label="Address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          <Button type="submit" loading={b1}>Save changes</Button>
        </form>
        <form onSubmit={savePw} className="card space-y-4 p-6" noValidate>
          <h2 className="text-lg font-semibold">Change password</h2>
          <Input id="pw-current" label="Current password" type="password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} error={e2.current_password} />
          <Input id="pw-new" label="New password" type="password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} error={e2.new_password} hint="Minimum 8 characters" />
          <Input id="pw-confirm" label="Confirm new password" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={e2.confirm} />
          <Button type="submit" variant="secondary" loading={b2}>Update password</Button>
        </form>
      </div>
    </>
  )
}
