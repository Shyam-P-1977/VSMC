import apiClient from './client';

export const reportApi = {
  revenue: async (fromDate = '', toDate = '', exportCsv = false) => {
    const params = { from: fromDate, to: toDate };
    if (exportCsv) params.export = 'csv';
    const res = await apiClient.get('/reports/revenue', {
      params,
      responseType: exportCsv ? 'blob' : 'json'
    });
    return res.data;
  },
  bookings: async (fromDate = '', toDate = '', exportCsv = false) => {
    const params = { from: fromDate, to: toDate };
    if (exportCsv) params.export = 'csv';
    const res = await apiClient.get('/reports/bookings', {
      params,
      responseType: exportCsv ? 'blob' : 'json'
    });
    return res.data;
  },
  inventory: async (exportCsv = false) => {
    const params = {};
    if (exportCsv) params.export = 'csv';
    const res = await apiClient.get('/reports/inventory', {
      params,
      responseType: exportCsv ? 'blob' : 'json'
    });
    return res.data;
  },
  mechanicPerformance: async (fromDate = '', toDate = '', exportCsv = false) => {
    const params = { from: fromDate, to: toDate };
    if (exportCsv) params.export = 'csv';
    const res = await apiClient.get('/reports/mechanic-performance', {
      params,
      responseType: exportCsv ? 'blob' : 'json'
    });
    return res.data;
  }
};
