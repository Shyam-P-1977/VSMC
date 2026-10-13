import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vscms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle errors & 401 auto logout
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-logout if failed on login endpoint itself
      const isLoginRequest = error.config.url.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('vscms_token');
        localStorage.removeItem('vscms_user');
        window.dispatchEvent(new Event('vscms_auth_logout'));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
