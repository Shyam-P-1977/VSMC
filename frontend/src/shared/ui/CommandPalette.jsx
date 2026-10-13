import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Car, FileText, Settings, Shield, Wrench, Home, LogOut } from 'lucide-react';
import { useAuth } from '../../app/context/AuthContext';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const baseActions = [
    { id: 'home', label: 'Go to Landing Page', icon: Home, path: '/' },
  ];

  const customerActions = [
    { id: 'dash', label: 'Customer Overview', icon: Car, path: '/dashboard' },
    { id: 'book', label: 'Book a New Service', icon: Calendar, path: '/dashboard/book' },
    { id: 'vehicles', label: 'My Vehicles', icon: Car, path: '/dashboard/vehicles' },
    { id: 'bookings', label: 'My Bookings & Timeline', icon: Calendar, path: '/dashboard/bookings' },
    { id: 'invoices', label: 'Invoices & Payments', icon: FileText, path: '/dashboard/invoices' },
    { id: 'profile', label: 'Profile Settings', icon: Settings, path: '/dashboard/profile' },
  ];

  const mechanicActions = [
    { id: 'mech-dash', label: 'Mechanic Workbench', icon: Wrench, path: '/mechanic' },
    { id: 'mech-history', label: 'My Completed Jobs', icon: FileText, path: '/mechanic/history' },
    { id: 'mech-profile', label: 'My Profile', icon: Settings, path: '/mechanic/profile' },
  ];

  const adminActions = [
    { id: 'admin-dash', label: 'Admin Command Center', icon: Shield, path: '/admin' },
    { id: 'admin-bookings', label: 'Manage All Bookings', icon: Calendar, path: '/admin/bookings' },
    { id: 'admin-customers', label: 'Customer Management', icon: Car, path: '/admin/customers' },
    { id: 'admin-mechanics', label: 'Mechanic Staff & Capacity', icon: Wrench, path: '/admin/mechanics' },
    { id: 'admin-services', label: 'Service Catalog & Slots', icon: Settings, path: '/admin/services' },
    { id: 'admin-inventory', label: 'Spare Parts Inventory', icon: Wrench, path: '/admin/inventory' },
    { id: 'admin-invoices', label: 'Invoices & Settlements', icon: FileText, path: '/admin/invoices' },
    { id: 'admin-reports', label: 'Business Analytics & Reports', icon: FileText, path: '/admin/reports' },
    { id: 'admin-messages', label: 'Contact Messages Inbox', icon: FileText, path: '/admin/messages' },
  ];

  let relevantActions = [...baseActions];
  if (user?.Role === 'admin') relevantActions = [...relevantActions, ...adminActions];
  else if (user?.Role === 'mechanic') relevantActions = [...relevantActions, ...mechanicActions];
  else if (user?.Role === 'customer') relevantActions = [...relevantActions, ...customerActions];

  const filtered = relevantActions.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (action) => {
    setIsOpen(false);
    navigate(action.path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div
        className="fixed inset-0 bg-ink/70 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or navigate... (e.g. book, vehicles)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400">
              No matching commands found.
            </p>
          ) : (
            filtered.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleSelect(action)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-slate-800 transition"
                >
                  <Icon className="w-4 h-4 text-teal-700 dark:text-yellow-signal" />
                  <span className="flex-1 font-medium">{action.label}</span>
                </button>
              );
            })
          )}

          {user && (
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Tip: Press Ctrl+K anywhere to open</span>
          <span>VSCMS Quick Navigator</span>
        </div>
      </div>
    </div>
  );
}
