import apiClient from './client';

export const vehicleApi = {
  list: async (customerId = null) => {
    const params = customerId ? { customer_id: customerId } : {};
    const res = await apiClient.get('/vehicles', { params });
    return res.data;
  },
  add: async (vehicleData) => {
    const res = await apiClient.post('/vehicles', vehicleData);
    return res.data;
  },
  create: async (vehicleData) => {
    const res = await apiClient.post('/vehicles', vehicleData);
    return res.data;
  },
  update: async (vehicleId, vehicleData) => {
    const res = await apiClient.put(`/vehicles/${vehicleId}`, vehicleData);
    return res.data;
  },
  getHistory: async (vehicleId) => {
    const res = await apiClient.get(`/vehicles/${vehicleId}/history`);
    return res.data;
  }
};
