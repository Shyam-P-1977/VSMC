import apiClient from './client';

export const requestApi = {
  book: async (bookingData) => {
    const res = await apiClient.post('/requests', bookingData);
    return res.data;
  },
  list: async (filters = {}) => {
    const res = await apiClient.get('/requests', { params: filters });
    return res.data;
  },
  getById: async (requestId) => {
    const res = await apiClient.get(`/requests/${requestId}`);
    return res.data;
  },
  cancel: async (requestId, reason) => {
    const res = await apiClient.post(`/requests/${requestId}/cancel`, { reason });
    return res.data;
  },
  accept: async (requestId) => {
    const res = await apiClient.post(`/requests/${requestId}/accept`);
    return res.data;
  },
  reject: async (requestId, reason, reason_category = 'Other') => {
    const res = await apiClient.post(`/requests/${requestId}/reject`, { reason, reason_category });
    return res.data;
  },
  assign: async (requestId, mechanicId) => {
    const res = await apiClient.post(`/requests/${requestId}/assign`, { mechanic_id: mechanicId });
    return res.data;
  },
  uploadAttachments: async (requestId, formData) => {
    const res = await apiClient.post(`/requests/${requestId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  getAttachmentUrl: (requestId, attachmentId) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${apiClient.defaults.baseURL}/requests/${requestId}/attachments/${attachmentId}${tokenParam}`;
  }
};
