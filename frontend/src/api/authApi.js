import apiClient from './client';

export const authApi = {
  login: async (email, password, role) => {
    const res = await apiClient.post('/auth/login', { email, password, role });
    return res.data;
  },
  register: async (userData) => {
    const res = await apiClient.post('/auth/register', userData);
    return res.data;
  },
  registerMechanic: async (mechanicData) => {
    const res = await apiClient.post('/auth/register-mechanic', mechanicData);
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  updateProfile: async (profileData) => {
    const res = await apiClient.put('/auth/profile', profileData);
    return res.data;
  },
  updateLocation: async (locationData) => {
    const res = await apiClient.put('/auth/location', locationData);
    return res.data;
  }
};
