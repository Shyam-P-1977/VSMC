import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Wrench, Car, Calendar, FileText, Settings, Shield, Bell, LogOut,
  Menu, X, Search, ChevronRight, User as UserIcon, CheckCheck, Inbox,
  MapPin, Building2, Receipt, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle, CommandPalette, Badge } from '../../shared/ui';
import { notificationApi } from '../../api';
import { LocationModal } from '../../features/customer/LocationModal';

export function DashboardLayout({ children, title, subtitle }) {
  const { user, logout, isCustomer, isCenter, isPlatformAdmin, userLocation } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.list();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, Is_Read: true })));
    } catch {
      // ignore
    }
  };

  // Navigation Links tailored to role
  const getNavLinks = () => {
    if (user?.Role === 'platform_admin') {
      return [
        { label: 'Platform Hub', path: '/platform', icon: Shield },
      ];
    }
    if (user?.Role === 'admin' || user?.Role === 'center') {
      return [
        { label: 'Command Center', path: '/admin/dashboard', icon: Shield },
        { label: 'Appointment Requests', path: '/admin/bookings', icon: Calendar },
        { label: 'Workshop Profile', path: '/admin/profile', icon: Building2 },
        { label: 'Mechanics Roster', path: '/admin/mechanics', icon: Wrench },
        { label: 'Services & Slots', path: '/admin/services', icon: Settings },
        { label: 'Spare Parts Stock', path: '/admin/inventory', icon: Inbox },
        { label: 'Invoices & Ledger', path: '/admin/invoices', icon: FileText },
        { label: 'Customer Directory', path: '/admin/customers', icon: Users },
        { label: 'Performance Reports', path: '/admin/reports', icon: FileText },
      ];
    }
    if (user?.Role === 'mechanic') {
      return [
        { label: 'My Workbench', path: '/mechanic', icon: Wrench },
        { label: 'Completed Jobs', path: '/mechanic/history', icon: FileText },
        { label: 'My Profile', path: '/mechanic/profile', icon: Settings },
      ];
    }
    // Default Customer
    return [
      { label: 'Nearby Workshops', path: '/customer/centers', icon: Building2 },
      { label: 'Book a Service', path: '/customer/book', icon: Calendar },
      { label: 'My Bookings', path: '/customer/bookings', icon: Calendar },
      { label: 'My Receipts', path: '/customer/receipts', icon: Receipt },
      { label: 'Invoices & Pay', path: '/dashboard/invoices', icon: FileText },
      { label: 'My Vehicles', path: '/dashboard/vehicles', icon: Car },
      { label: 'My Profile', path: '/dashboard/profile', icon: Settings },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <div className="min-h-screen flex bg-[#F8FAFA] dark:bg-[#022828] text-[#0F1B1B] dark:text-[#E2E8F0] antialiased">
      <CommandPalette />
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-teal-900 text-white shrink-0 shadow-xl border-r border-teal-800">
        {/* Brand */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-teal-800">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-yellow-signal flex items-center justify-center text-ink shadow font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-2xl tracking-wider text-white font-black leading-none">
                VSCMS<span className="text-yellow-signal">.</span>
              </span>
              <span className="text-[10px] text-yellow-signal font-bold uppercase tracking-widest">
                {user?.Role || 'Portal'}
              </span>
            </div>
          </Link>
        </div>

        {/* Center Code Badge if applicable */}
        {(user?.Center_Code || user?.center_code) && (
          <div className="mx-4 mt-3 px-3.5 py-2 rounded-xl bg-teal-950/80 border border-teal-800/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-teal-300 font-extrabold">WORKSHOP CODE</span>
              <span className="font-mono text-xs font-black text-yellow-signal tracking-wider">{user.Center_Code || user.center_code}</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-800/60 text-teal-200 font-bold">ACTIVE</span>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;

            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs md:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-yellow-signal text-ink shadow-sm font-bold'
                    : 'text-teal-100 hover:bg-teal-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-ink' : 'text-teal-300'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout in Sidebar bottom */}
        <div className="p-4 border-t border-teal-800 bg-teal-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-teal-800 text-yellow-signal font-bold flex items-center justify-center text-sm shrink-0">
                {user?.Name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user?.Name}</p>
                <p className="text-[11px] text-teal-300 truncate font-mono">{user?.Email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-teal-300 hover:text-rose-400 hover:bg-teal-800/60 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-20 bg-white dark:bg-[#043433] border-b border-slate-200/80 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 transition-colors">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Breadcrumb / Page Title */}
            <div>
              <h2 className="text-lg md:text-xl font-bold font-display uppercase tracking-wide text-slate-900 dark:text-white leading-tight">
                {title || 'Dashboard'}
              </h2>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Customer Location Chip */}
            {isCustomer && (
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-teal-200 dark:border-teal-800 bg-teal-50/80 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 hover:bg-teal-100 transition text-xs font-semibold"
                title="Click to update your service area"
              >
                <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-yellow-signal shrink-0" />
                <span className="max-w-[130px] truncate hidden sm:inline">
                  {userLocation?.area ? `${userLocation.area}, ${userLocation.city}` : 'Maharashtra'}
                </span>
                <span className="text-[10px] text-teal-700 dark:text-yellow-signal font-bold uppercase underline">
                  Change location
                </span>
              </button>
            )}

            {/* Quick search button that triggers Command Palette */}
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs bg-slate-50 dark:bg-slate-800/60 transition"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search (Ctrl+K)</span>
            </button>

            <ThemeToggle />

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(prev => !prev)}
                className="relative p-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-yellow-signal rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Notifications ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-teal-600 dark:text-yellow-signal font-semibold hover:underline flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.Notification_ID}
                          className={`p-3 rounded-2xl border text-xs transition ${
                            n.Is_Read
                              ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                              : 'bg-yellow-tint/40 dark:bg-yellow-signal/10 border-yellow-signal/40 font-medium text-slate-900 dark:text-white'
                          }`}
                        >
                          <p className="leading-relaxed">{n.Message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                            {n.Created_At ? new Date(n.Created_At).toLocaleString() : ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill / Menu */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {user?.Name?.split(' ')[0]}
              </span>
              <Badge variant="yellow" size="sm">
                {user?.Role}
              </Badge>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Slide-over Drawer Menu */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-ink/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-teal-900 text-white shadow-2xl flex flex-col z-10">
            <div className="h-20 px-6 flex items-center justify-between border-b border-teal-800">
              <span className="font-display text-2xl tracking-wider text-white font-black">
                VSCMS<span className="text-yellow-signal">.</span>
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-teal-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                      isActive
                        ? 'bg-yellow-signal text-ink font-bold'
                        : 'text-teal-100 hover:bg-teal-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-teal-800 bg-teal-950/60 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{user?.Name}</p>
                <p className="text-[11px] text-teal-300 capitalize">{user?.Role}</p>
              </div>
              <button onClick={logout} className="p-2 text-rose-300">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white dark:bg-[#043433] border-t border-slate-200 dark:border-slate-800 px-4 flex items-center justify-around z-30 shadow-lg">
        {navLinks.slice(0, 4).map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition ${
                isActive
                  ? 'text-teal-900 dark:text-yellow-signal font-bold'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
