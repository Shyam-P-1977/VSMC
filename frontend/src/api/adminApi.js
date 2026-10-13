import apiClient from './client';

export const adminApi = {
  getDashboardKpis: async () => {
    const res = await apiClient.get('/admin/dashboard');
    return res.data;
  },
  listCustomers: async (search = '') => {
    const res = await apiClient.get('/admin/customers', { params: { search } });
    return res.data;
  },
  createCustomer: async (customerData) => {
    const res = await apiClient.post('/admin/customers', customerData);
    return res.data;
  },
  updateCustomer: async (customerId, customerData) => {
    const res = await apiClient.put(`/admin/customers/${customerId}`, customerData);
    return res.data;
  },
  listMechanics: async () => {
    const res = await apiClient.get('/admin/mechanics');
    return res.data;
  },
  createMechanic: async (mechanicData) => {
    const res = await apiClient.post('/admin/mechanics', mechanicData);
    return res.data;
  },
  updateMechanic: async (mechanicId, mechanicData) => {
    const res = await apiClient.put(`/admin/mechanics/${mechanicId}`, mechanicData);
    return res.data;
  },
  toggleUserActive: async (userId, isActive) => {
    const res = await apiClient.put(`/admin/users/${userId}/active`, { is_active: isActive });
    return res.data;
  },
  getContactMessages: async () => {
    const res = await apiClient.get('/admin/contact-messages');
    return res.data;
  }
};
