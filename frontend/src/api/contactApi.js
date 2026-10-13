import apiClient from './client';

export const contactApi = {
  submit: async (contactData) => {
    const res = await apiClient.post('/contact', contactData);
    return res.data;
  }
};
