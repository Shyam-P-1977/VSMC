import apiClient from './client';

export const billingApi = {
  list: async (status = '') => {
    const res = await apiClient.get('/invoices', { params: { status } });
    return res.data;
  },
  getById: async (invoiceId) => {
    const res = await apiClient.get(`/invoices/${invoiceId}`);
    return res.data;
  },
  download: async (invoiceId) => {
    const res = await apiClient.get(`/invoices/${invoiceId}/download`);
    return res.data;
  },
  addAdjustment: async (invoiceId, reason, amount) => {
    const res = await apiClient.post(`/invoices/${invoiceId}/adjustment`, { reason, amount });
    return res.data;
  },
  markPaid: async (invoiceId, method = 'Cash', notes = '') => {
    const res = await apiClient.post(`/invoices/${invoiceId}/mark-paid`, { method, notes });
    return res.data;
  }
};
