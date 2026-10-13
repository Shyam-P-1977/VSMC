import apiClient from './client';

export const inventoryApi = {
  list: async (search = '', lowStockOnly = false) => {
    const res = await apiClient.get('/parts', {
      params: { search, low_stock: lowStockOnly }
    });
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
  }
};
