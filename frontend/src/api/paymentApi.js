import apiClient from './client';

export const paymentApi = {
  initiate: async (invoiceId) => {
    const res = await apiClient.post('/payments/initiate', { invoice_id: invoiceId });
    return res.data;
  },
  process: async (invoiceId, method, details) => {
    const res = await apiClient.post('/payments/process', {
      invoice_id: invoiceId,
      method,
      details
    });
    return res.data;
  },
  cancel: async (invoiceId) => {
    const res = await apiClient.post('/payments/cancel', { invoice_id: invoiceId });
    return res.data;
  },
  getReceipt: async (paymentId) => {
    const res = await apiClient.get(`/payments/${paymentId}/receipt`);
    return res.data;
  },
  getReceiptPdfUrl: (paymentId) => {
    return `${apiClient.defaults.baseURL}/payments/${paymentId}/receipt/pdf`;
  },
  listReceipts: async () => {
    const res = await apiClient.get('/receipts');
    return res.data;
  }
};
