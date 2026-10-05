import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AppLayout from './components/AppLayout'

// Landing & Auth
import PublicShell from './features/landing/PublicShell'
import Landing from './features/landing/Landing'
import Login from './features/auth/Login'
import Register from './features/auth/Register'

// Shared
import Help from './features/shared/Help'
import NotificationsPage from './features/shared/NotificationsPage'
import ProfilePage from './features/shared/ProfilePage'
import RequestDetail from './features/shared/RequestDetail'

// Customer
import CustomerDashboard from './features/customer/CustomerDashboard'
import Vehicles from './features/customer/Vehicles'
import CustomerBook from './features/customer/CustomerBook'
import CustomerBookings from './features/customer/CustomerBookings'
import CustomerInvoices from './features/customer/CustomerInvoices'
import CustomerHistory from './features/customer/CustomerHistory'

// Admin
import AdminDashboard from './features/admin/AdminDashboard'
import AdminRequests from './features/admin/AdminRequests'
import AdminBookings from './features/admin/AdminBookings'
import AdminCustomers from './features/admin/AdminCustomers'
import AdminMechanics from './features/admin/AdminMechanics'
import AdminServices from './features/admin/AdminServices'
import AdminInventory from './features/admin/AdminInventory'
import AdminInvoices from './features/admin/AdminInvoices'
import AdminReports from './features/admin/AdminReports'
import AdminSlots from './features/admin/AdminSlots'

import MechanicJobs from './features/mechanic/MechanicJobs'
import MechanicJobEditor from './features/mechanic/MechanicJobEditor'
import MechanicHistory from './features/mechanic/MechanicHistory'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />
  }
  return children
}

import { ErrorBoundary } from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<PublicShell />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Customer Routes */}
        <Route path="/customer" element={<ProtectedRoute allowedRoles={['customer']}><AppLayout /></ProtectedRoute>}>
          <Route index element={<CustomerDashboard />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="book" element={<CustomerBook />} />
          <Route path="bookings" element={<CustomerBookings />} />
          <Route path="bookings/:id" element={<RequestDetail />} />
          <Route path="invoices" element={<CustomerInvoices />} />
          <Route path="history" element={<CustomerHistory />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="help" element={<Help />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="requests/:id" element={<RequestDetail />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="mechanics" element={<AdminMechanics />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="slots" element={<AdminSlots />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="invoices" element={<AdminInvoices />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="help" element={<Help />} />
        </Route>

        {/* Mechanic Routes */}
        <Route path="/mechanic" element={<ProtectedRoute allowedRoles={['mechanic']}><AppLayout /></ProtectedRoute>}>
          <Route index element={<MechanicJobs />} />
          <Route path="jobs/:id" element={<MechanicJobEditor />} />
          <Route path="history" element={<MechanicHistory />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="help" element={<Help />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
