import apiClient from './client';

export const mechanicApi = {
  getAvailable: async () => {
    const res = await apiClient.get('/admin/mechanics/available');
    return res.data;
  },
  assignMechanic: async (requestId, mechanicId) => {
    const res = await apiClient.post(`/requests/${requestId}/assign`, { mechanic_id: mechanicId });
    return res.data;
  },
  updateStatus: async (requestId, status, note = '') => {
    const res = await apiClient.put(`/requests/${requestId}/status`, { status, note });
    return res.data;
  },
  logPart: async (requestId, partId, quantity) => {
    const res = await apiClient.post(`/requests/${requestId}/parts`, { part_id: partId, quantity });
    return res.data;
  },
  removePart: async (requestId, partUsedId) => {
    const res = await apiClient.delete(`/requests/${requestId}/parts/${partUsedId}`);
    return res.data;
  },
  logLabour: async (requestId, labourData) => {
    const res = await apiClient.post(`/requests/${requestId}/labour`, labourData);
    return res.data;
  },
  completeJob: async (requestId, data = {}) => {
    const res = await apiClient.post(`/requests/${requestId}/complete`, data);
    return res.data;
  }
};
