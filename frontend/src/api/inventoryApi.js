import apiClient from './client';

export const inventoryApi = {
  list: async (searchOrParams = '', lowStockOnly = false) => {
    let params = {};
    if (typeof searchOrParams === 'object' && searchOrParams !== null) {
      params = { ...searchOrParams };
    } else {
      params = { search: searchOrParams, low_stock: lowStockOnly };
    }
    const res = await apiClient.get('/parts', { params });
    return res.data;
  },
  getSummary: async () => {
    const res = await apiClient.get('/parts/summary');
    return res.data;
  },
  getLowStock: async () => {
    const res = await apiClient.get('/parts/low-stock');
    return res.data;
  },
  add: async (partData) => {
    const res = await apiClient.post('/parts', partData);
    return res.data;
  },
  update: async (partId, partData) => {
    const res = await apiClient.put(`/parts/${partId}`, partData);
    return res.data;
  },
  delete: async (partId) => {
    const res = await apiClient.delete(`/parts/${partId}`);
    return res.data;
  },
  adjust: async (partId, delta, reason = 'Manual Stock Adjustment') => {
    const res = await apiClient.post(`/parts/${partId}/adjust`, { delta, reason });
    return res.data;
  },
  loadDefaults: async () => {
    const res = await apiClient.post('/parts/load-defaults');
    return res.data;
  },
  getMechanicJobOptions: async (requestId) => {
    const res = await apiClient.get(`/jobs/${requestId}/parts-options`);
    return res.data;
  }
};
