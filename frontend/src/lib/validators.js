export const isEmail = (v) => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test((v || '').trim())
export const isContact = (v) => /^\d{10}$/.test((v || '').replace(/[\s-]/g, ''))
export const normalizeReg = (v) => (v || '').replace(/[\s-]/g, '').toUpperCase()
export const isReg = (v) => /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(normalizeReg(v))

/** rules: { field: (value, all) => errorMessage | '' } -> returns errors object (empty when valid) */
export const validate = (values, rules) => {
  const errors = {}
  Object.entries(rules).forEach(([k, rule]) => {
    const msg = rule(values[k], values)
    if (msg) errors[k] = msg
  })
  return errors
}

export const req = (label) => (v) => (v === undefined || v === null || String(v).trim() === '' ? `${label} is required` : '')
export const emailRule = (v) => (!v?.trim() ? 'Email is required' : isEmail(v) ? '' : 'Enter a valid email address')
export const contactRule = (v) => (!v?.trim() ? 'Contact number is required' : isContact(v) ? '' : 'Contact number must be exactly 10 digits')
export const passwordRule = (v) => (!v ? 'Password is required' : v.length < 8 ? 'Password must be at least 8 characters' : '')
