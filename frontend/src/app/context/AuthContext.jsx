import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vscms_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('vscms_token') || null);
  const [loading, setLoading] = useState(true);

  const saveAuth = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('vscms_token', newToken);
    localStorage.setItem('vscms_user', JSON.stringify(newUser));
  };

  const clearAuth = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('vscms_token');
    localStorage.removeItem('vscms_user');
  };

  const login = async (email, password, role) => {
    const res = await authApi.login(email, password, role);
    saveAuth(res.token, res.user);
    return res.user;
  };

  const register = async (userData) => {
    const res = await authApi.register(userData);
    saveAuth(res.token, res.user);
    return res.user;
  };

  const registerMechanic = async (mechanicData) => {
    const res = await authApi.registerMechanic(mechanicData);
    saveAuth(res.token, res.user);
    return res;
  };

  const logout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      if (token) {
        const res = await authApi.getMe();
        setUser(res.user);
        localStorage.setItem('vscms_user', JSON.stringify(res.user));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        clearAuth();
      }
    }
  };

  useEffect(() => {
    const handleLogoutEvent = () => clearAuth();
    window.addEventListener('vscms_auth_logout', handleLogoutEvent);

    const checkToken = async () => {
      if (token) {
        try {
          const res = await authApi.getMe();
          setUser(res.user);
          localStorage.setItem('vscms_user', JSON.stringify(res.user));
        } catch {
          clearAuth();
        }
      }
      setLoading(false);
    };

    checkToken();
    return () => window.removeEventListener('vscms_auth_logout', handleLogoutEvent);
  }, []);

  const updateLocation = async (locationData) => {
    const res = await authApi.updateLocation(locationData);
    const updatedUser = {
      ...user,
      ...(res.user || {}),
      City: res.user?.City || locationData.city,
      city: res.user?.City || locationData.city,
      Area: res.user?.Area || locationData.area,
      area: res.user?.Area || locationData.area,
      State: res.user?.State || locationData.state,
      state: res.user?.State || locationData.state,
      Latitude: res.user?.Latitude ?? locationData.latitude,
      latitude: res.user?.Latitude ?? locationData.latitude,
      Longitude: res.user?.Longitude ?? locationData.longitude,
      longitude: res.user?.Longitude ?? locationData.longitude,
    };
    setUser(updatedUser);
    localStorage.setItem('vscms_user', JSON.stringify(updatedUser));
    return updatedUser;
  };

  const userCity = user?.City || user?.city;
  const userArea = user?.Area || user?.area;
  const hasLocation = Boolean(userCity && userArea);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.Role === 'admin' || user?.Role === 'center',
    isCenter: user?.Role === 'center' || user?.Role === 'admin',
    isMechanic: user?.Role === 'mechanic',
    isCustomer: user?.Role === 'customer',
    isPlatformAdmin: user?.Role === 'platform_admin',
    userLocation: {
      city: userCity,
      area: userArea,
      state: user?.State || user?.state || 'Maharashtra',
      latitude: user?.Latitude ?? user?.latitude,
      longitude: user?.Longitude ?? user?.longitude,
    },
    hasLocation,
    login,
    register,
    registerMechanic,
    logout,
    refreshUser,
    updateLocation
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
