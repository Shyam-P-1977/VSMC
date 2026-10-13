import apiClient from './client';

export const centerApi = {
  // Location and Discovery
  getCities: async () => {
    const res = await apiClient.get('/locations/cities');
    const rawCities = res.data?.cities || [];
    const cities = rawCities.map((c) => (typeof c === 'object' && c !== null ? c.name : c));
    return { ...res.data, cities, rawCities };
  },
  getAreas: async (city) => {
    const res = await apiClient.get('/locations/areas', { params: { city } });
    return res.data;
  },
  getNearestLocation: async (lat, lng) => {
    const res = await apiClient.post('/locations/nearest', { lat, lng });
    return res.data;
  },
  getCenters: async (params = {}) => {
    const res = await apiClient.get('/centers', { params });
    return res.data;
  },
  getCenterDetails: async (centerId) => {
    const res = await apiClient.get(`/centers/${centerId}`);
    return res.data;
  },
  getCenterSlots: async (centerId, date) => {
    const res = await apiClient.get(`/centers/${centerId}/slots`, { params: { date } });
    return res.data;
  },
  checkSlotAvailability: async (centerId, slotId) => {
    const res = await apiClient.post(`/centers/${centerId}/slots/check`, { slot_id: slotId });
    return res.data;
  },
  registerCenter: async (data) => {
    const res = await apiClient.post('/centers/register', data);
    return res.data;
  },
  verifyCenterCode: async (code) => {
    const res = await apiClient.get(`/centers/verify-code/${code}`);
    return res.data;
  },

  // Center Portal Management
  getCenterProfile: async () => {
    const res = await apiClient.get('/center/profile');
    return res.data;
  },
  updateCenterProfile: async (data) => {
    const res = await apiClient.put('/center/profile', data);
    return res.data;
  },
  getCenterServices: async () => {
    const res = await apiClient.get('/center/services');
    return res.data;
  },
  updateCenterService: async (serviceId, data) => {
    const res = await apiClient.put(`/center/services/${serviceId}`, data);
    return res.data;
  },
  getCenterMechanics: async () => {
    const res = await apiClient.get('/center/mechanics');
    return res.data;
  },
  createCenterMechanic: async (data) => {
    const res = await apiClient.post('/center/mechanics', data);
    return res.data;
  },
  updateCenterMechanic: async (mechanicId, data) => {
    const res = await apiClient.put(`/center/mechanics/${mechanicId}`, data);
    return res.data;
  },
  getCenterParts: async () => {
    const res = await apiClient.get('/center/parts');
    return res.data;
  },
  createCenterPart: async (data) => {
    const res = await apiClient.post('/center/parts', data);
    return res.data;
  },
  updateCenterPart: async (partId, data) => {
    const res = await apiClient.put(`/center/parts/${partId}`, data);
    return res.data;
  },
  deleteCenterPart: async (partId) => {
    const res = await apiClient.delete(`/center/parts/${partId}`);
    return res.data;
  },
  getCenterSlotsSchedule: async (date) => {
    const res = await apiClient.get('/center/slots', { params: { date } });
    return res.data;
  },
  updateCenterSlot: async (slotId, data) => {
    const res = await apiClient.put(`/center/slots/${slotId}`, data);
    return res.data;
  },
  getCenterReportsSummary: async () => {
    const res = await apiClient.get('/center/reports/summary');
    return res.data;
  },

  // Platform Admin Management
  getPlatformStats: async () => {
    const res = await apiClient.get('/platform/stats');
    return res.data;
  },
  getPlatformCenters: async (status) => {
    const res = await apiClient.get('/platform/centers', { params: { status } });
    return res.data;
  },
  approvePlatformCenter: async (centerId) => {
    const res = await apiClient.post(`/platform/centers/${centerId}/approve`);
    return res.data;
  },
  rejectPlatformCenter: async (centerId, reason) => {
    const res = await apiClient.post(`/platform/centers/${centerId}/reject`, { reason });
    return res.data;
  },
  suspendPlatformCenter: async (centerId, reason) => {
    const res = await apiClient.post(`/platform/centers/${centerId}/suspend`, { reason });
    return res.data;
  },
  getPlatformCustomers: async () => {
    const res = await apiClient.get('/platform/customers');
    return res.data;
  },
  getPlatformBookings: async () => {
    const res = await apiClient.get('/platform/bookings');
    return res.data;
  }
};
