import client from './client'

const get = (url, params) => client.get(url, { params }).then((r) => r.data)
const post = (url, body) => client.post(url, body).then((r) => r.data)
const put = (url, body) => client.put(url, body).then((r) => r.data)
const del = (url) => client.delete(url).then((r) => r.data)

export const auth = {
  login: (b) => post('/auth/login', b),
  register: (b) => post('/auth/register', b),
  me: () => get('/auth/me'),
  updateProfile: (b) => put('/auth/profile', b),
}

export const vehicles = {
  list: (p) => get('/vehicles', { per_page: 100, ...p }),
  create: (b) => post('/vehicles', b),
  update: (id, b) => put(`/vehicles/${id}`, b),
  history: (id) => get(`/vehicles/${id}/history`),
}

export const catalog = {
  list: (all) => get('/services', all ? { all: 1 } : undefined),
  create: (b) => post('/services', b),
  update: (id, b) => put(`/services/${id}`, b),
  remove: (id) => del(`/services/${id}`),
}

export const slots = {
  list: (date) => get('/slots', { date }),
  update: (id, capacity) => put(`/slots/${id}`, { capacity }),
  bulk: (date, capacity) => put('/slots/bulk', { date, capacity }),
}

export const requests = {
  list: (p) => get('/requests', p),
  get: (id) => get(`/requests/${id}`),
  book: (b) => post('/requests', b),
  cancel: (id) => post(`/requests/${id}/cancel`),
  remove: (id) => del(`/requests/${id}`),
  assign: (id, mechanic_id) => post(`/requests/${id}/assign`, { mechanic_id }),
  status: (id, status, extra) => put(`/requests/${id}/status`, { status, ...extra }),
  addPart: (id, part_id, quantity) => post(`/requests/${id}/parts`, { part_id, quantity }),
  removePart: (id, jid) => del(`/requests/${id}/parts/${jid}`),
  addLabour: (id, b) => post(`/requests/${id}/labour`, b),
  removeLabour: (id, lid) => del(`/requests/${id}/labour/${lid}`),
  complete: (id, no_parts_confirmed) => post(`/requests/${id}/complete`, { no_parts_confirmed }),
  uploadAttachment: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return client.post(`/requests/${id}/attachments`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  }
}

export const parts = {
  list: (p) => get('/parts', { per_page: 200, ...p }),
  lowStock: () => get('/parts/low-stock'),
  create: (b) => post('/parts', b),
  update: (id, b) => put(`/parts/${id}`, b),
  remove: (id) => del(`/parts/${id}`),
}

export const admin = {
  dashboard: () => get('/admin/dashboard'),
  settings: () => get('/admin/settings'),
  updateSettings: (b) => put('/admin/settings', b),
  customers: (p) => get('/admin/customers', p),
  createCustomer: (b) => post('/admin/customers', b),
  updateCustomer: (id, b) => put(`/admin/customers/${id}`, b),
  mechanics: (p) => get('/admin/mechanics', { per_page: 100, ...p }),
  availableMechanics: () => get('/admin/mechanics/available'),
  createMechanic: (b) => post('/admin/mechanics', b),
  updateMechanic: (id, b) => put(`/admin/mechanics/${id}`, b),
  deleteMechanic: (id) => del(`/admin/mechanics/${id}`),
}

export const invoices = {
  list: (p) => get('/invoices', p),
  get: (id) => get(`/invoices/${id}`),
  html: (id) => client.get(`/invoices/${id}/download`, { responseType: 'text', transformResponse: (d) => d }).then((r) => r.data),
  setDiscount: (id, discount) => put(`/invoices/${id}`, { discount }),
  adjust: (id, b) => post(`/invoices/${id}/adjustment`, b),
  markPaid: (id, method) => post(`/invoices/${id}/mark-paid`, { method }),
}

export const payments = {
  initiate: (invoice_id, method) => post('/payments/initiate', { invoice_id, method }),
  process: (b) => post('/payments/process', b),
  cancel: (payment_id) => post('/payments/cancel', { payment_id }),
  receipt: (id) => get(`/payments/${id}/receipt`),
  receiptHtml: (id) => client.get(`/payments/${id}/receipt`, { params: { format: 'html' }, responseType: 'text', transformResponse: (d) => d }).then((r) => r.data),
}

export const notifications = {
  list: (p) => get('/notifications', p),
  read: (id) => put(`/notifications/${id}/read`),
  readAll: () => put('/notifications/read-all'),
}

export const reports = {
  get: (name, p) => get(`/reports/${name}`, p),
  csv: (name, p) => client.get(`/reports/${name}`, { params: { ...p, format: 'csv' }, responseType: 'blob' }).then((r) => r.data),
}
