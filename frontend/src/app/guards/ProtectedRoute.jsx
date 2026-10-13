import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFA] dark:bg-[#042828]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-yellow-signal rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-teal-900 dark:text-teal-100">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = user?.Role;
  const isAllowed = !allowedRoles || allowedRoles.some(r => {
    if (r === userRole) return true;
    if ((r === 'admin' && userRole === 'center') || (r === 'center' && userRole === 'admin')) return true;
    return false;
  });

  if (!isAllowed) {
    if (userRole === 'admin' || userRole === 'center') return <Navigate to="/admin" replace />;
    if (userRole === 'mechanic') return <Navigate to="/mechanic" replace />;
    if (userRole === 'platform_admin') return <Navigate to="/platform" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
