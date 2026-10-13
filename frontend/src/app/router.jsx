import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './guards/ProtectedRoute';
import { LocationGuard } from './guards/LocationGuard';
import { ErrorBoundary } from './guards/ErrorBoundary';

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFA] dark:bg-[#042828]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-yellow-signal rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-teal-900 dark:text-teal-100">Loading VSCMS Module...</p>
      </div>
    </div>
  );
}

// Lazy loaded page components
// Public & Auth
const LandingPage = lazy(() => import('../features/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('../features/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('../features/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));

// Customer Journey (Multi-Center)
const LocationSelectPage = lazy(() => import('../features/customer/LocationSelectPage').then(m => ({ default: m.LocationSelectPage })));
const CenterListPage = lazy(() => import('../features/customer/CenterListPage').then(m => ({ default: m.CenterListPage })));
const BookServiceWizard = lazy(() => import('../features/customer/BookServiceWizard').then(m => ({ default: m.BookServiceWizard })));
const MyBookings = lazy(() => import('../features/customer/MyBookings').then(m => ({ default: m.MyBookings })));
const CustomerReceiptsPage = lazy(() => import('../features/customer/CustomerReceiptsPage').then(m => ({ default: m.CustomerReceiptsPage })));
const CustomerOverview = lazy(() => import('../features/customer/CustomerOverview').then(m => ({ default: m.CustomerOverview })));
const MyVehicles = lazy(() => import('../features/customer/MyVehicles').then(m => ({ default: m.MyVehicles })));
const CustomerInvoices = lazy(() => import('../features/customer/CustomerInvoices').then(m => ({ default: m.CustomerInvoices })));
const CustomerProfile = lazy(() => import('../features/customer/CustomerProfile').then(m => ({ default: m.CustomerProfile })));

// Mechanic
const MechanicDashboard = lazy(() => import('../features/mechanic/MechanicDashboard').then(m => ({ default: m.MechanicDashboard })));
const MechanicHistory = lazy(() => import('../features/mechanic/MechanicHistory').then(m => ({ default: m.MechanicHistory })));
const MechanicProfile = lazy(() => import('../features/mechanic/MechanicProfile').then(m => ({ default: m.MechanicProfile })));

// Center / Admin
const AdminDashboard = lazy(() => import('../features/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminBookings = lazy(() => import('../features/admin/AdminBookings').then(m => ({ default: m.AdminBookings })));
const AdminCenterProfile = lazy(() => import('../features/admin/AdminCenterProfile').then(m => ({ default: m.AdminCenterProfile })));
const AdminCustomers = lazy(() => import('../features/admin/AdminCustomers').then(m => ({ default: m.AdminCustomers })));
const AdminMechanics = lazy(() => import('../features/admin/AdminMechanics').then(m => ({ default: m.AdminMechanics })));
const AdminServices = lazy(() => import('../features/admin/AdminServices').then(m => ({ default: m.AdminServices })));
const AdminInventory = lazy(() => import('../features/admin/AdminInventory').then(m => ({ default: m.AdminInventory })));
const AdminInvoices = lazy(() => import('../features/admin/AdminInvoices').then(m => ({ default: m.AdminInvoices })));
const AdminReports = lazy(() => import('../features/admin/AdminReports').then(m => ({ default: m.AdminReports })));
const AdminMessages = lazy(() => import('../features/admin/AdminMessages').then(m => ({ default: m.AdminMessages })));

// Platform Admin
const PlatformAdminPage = lazy(() => import('../features/platform/PlatformAdminPage').then(m => ({ default: m.PlatformAdminPage })));

export function AppRouter() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Customer Journey Step 1: Mandatory Location Gate */}
          <Route
            path="/customer/location"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <LocationSelectPage />
              </ProtectedRoute>
            }
          />

          {/* Customer Journey Step 2: Nearby Centers List */}
          <Route
            path="/customer/centers"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <LocationGuard>
                  <CenterListPage />
                </LocationGuard>
              </ProtectedRoute>
            }
          />

          {/* Customer Journey Steps 3 & 4: Booking Wizard */}
          <Route
            path="/customer/book"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <LocationGuard>
                  <BookServiceWizard />
                </LocationGuard>
              </ProtectedRoute>
            }
          />

          {/* Customer Journey Steps 5, 6, 7: Tracking, Decision & Invoice */}
          <Route
            path="/customer/bookings"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <MyBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/bookings/:id"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <MyBookings />
              </ProtectedRoute>
            }
          />

          {/* Customer Receipts */}
          <Route
            path="/customer/receipts"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerReceiptsPage />
              </ProtectedRoute>
            }
          />

          {/* Customer Fleet & Profile */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/vehicles"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <MyVehicles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/book"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <LocationGuard>
                  <BookServiceWizard />
                </LocationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/bookings"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <MyBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/invoices"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerInvoices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/profile"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerProfile />
              </ProtectedRoute>
            }
          />

          {/* Mechanic Routes */}
          <Route
            path="/mechanic"
            element={
              <ProtectedRoute allowedRoles={['mechanic']}>
                <MechanicDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mechanic/history"
            element={
              <ProtectedRoute allowedRoles={['mechanic']}>
                <MechanicHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mechanic/profile"
            element={
              <ProtectedRoute allowedRoles={['mechanic']}>
                <MechanicProfile />
              </ProtectedRoute>
            }
          />

          {/* Service Center / Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin', 'center']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'center']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <ProtectedRoute allowedRoles={['admin', 'center']}>
                <AdminBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute allowedRoles={['admin', 'center']}>
                <AdminCenterProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/customers"
            element={
              <ProtectedRoute allowedRoles={['admin', 'center']}>
                <AdminCustomers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mechanics"
            element={
              <ProtectedRoute allowedRoles={['admin', 'center']}>
                <AdminMechanics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/services"
            element={
              <ProtectedRoute allowedRoles={['admin', 'center']}>
                <AdminServices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/inventory"
            element={
              <ProtectedRoute allowedRoles={['admin', 'center']}>
                <AdminInventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/invoices"
            element={
              <ProtectedRoute allowedRoles={['admin', 'center']}>
                <AdminInvoices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'center']}>
                <AdminReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/messages"
            element={
              <ProtectedRoute allowedRoles={['admin', 'center']}>
                <AdminMessages />
              </ProtectedRoute>
            }
          />

          {/* Center Route Aliases */}
          <Route path="/center" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/center/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/center/requests" element={<Navigate to="/admin/bookings" replace />} />
          <Route path="/center/bookings" element={<Navigate to="/admin/bookings" replace />} />
          <Route path="/center/profile" element={<Navigate to="/admin/profile" replace />} />
          <Route path="/center/mechanics" element={<Navigate to="/admin/mechanics" replace />} />
          <Route path="/center/services" element={<Navigate to="/admin/services" replace />} />
          <Route path="/center/inventory" element={<Navigate to="/admin/inventory" replace />} />
          <Route path="/center/invoices" element={<Navigate to="/admin/invoices" replace />} />
          <Route path="/center/reports" element={<Navigate to="/admin/reports" replace />} />

          {/* Platform Supervisor Routes */}
          <Route
            path="/platform"
            element={
              <ProtectedRoute allowedRoles={['platform_admin']}>
                <PlatformAdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/platform/centers"
            element={
              <ProtectedRoute allowedRoles={['platform_admin']}>
                <PlatformAdminPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
