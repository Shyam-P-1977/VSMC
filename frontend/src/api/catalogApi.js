import apiClient from './client';

export const catalogApi = {
  getServices: async (showAll = false) => {
    const res = await apiClient.get('/services', { params: { all: showAll } });
    return res.data;
  },
  createService: async (serviceData) => {
    const res = await apiClient.post('/services', serviceData);
    return res.data;
  },
  updateService: async (serviceId, serviceData) => {
    const res = await apiClient.put(`/services/${serviceId}`, serviceData);
    return res.data;
  },
  deleteService: async (serviceId) => {
    const res = await apiClient.delete(`/services/${serviceId}`);
    return res.data;
  },
  getSlots: async (dateStr) => {
    const res = await apiClient.get('/slots', { params: { date: dateStr } });
    return res.data;
  },
  updateSlotCapacity: async (slotId, capacity) => {
    const res = await apiClient.put(`/slots/${slotId}`, { capacity });
    return res.data;
  }
};
