import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LocationGuard({ children }) {
  const { user, isCustomer, hasLocation, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFA] dark:bg-[#042828]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-yellow-signal rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-teal-900 dark:text-teal-100">Checking location profile...</p>
        </div>
      </div>
    );
  }

  // Only customers are location-gated
  if (isCustomer && !hasLocation) {
    return <Navigate to="/customer/location" state={{ from: location }} replace />;
  }

  return children;
}
