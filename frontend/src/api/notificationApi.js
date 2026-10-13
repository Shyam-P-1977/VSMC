import apiClient from './client';

export const notificationApi = {
  list: async () => {
    const res = await apiClient.get('/notifications');
    return res.data;
  },
  markRead: async (notificationId) => {
    const res = await apiClient.put(`/notifications/${notificationId}/read`);
    return res.data;
  },
  markAllRead: async () => {
    const res = await apiClient.put('/notifications/read-all');
    return res.data;
  }
};
