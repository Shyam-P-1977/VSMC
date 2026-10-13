import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wrench, Menu, X, ArrowRight, ShieldCheck, Phone, MapPin, Clock } from 'lucide-react';
import { Button, ThemeToggle, Squiggle } from '../../shared/ui';
import { useAuth } from '../context/AuthContext';

export function LandingLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.Role === 'admin') return '/admin';
    if (user.Role === 'mechanic') return '/mechanic';
    return '/dashboard';
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#022828] text-[#0F1B1B] dark:text-[#E2E8F0] selection:bg-yellow-signal selection:text-ink">
      {/* 1. STICKY NAV */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#043433]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-teal-900 dark:bg-yellow-signal flex items-center justify-center text-yellow-signal dark:text-ink shadow-md group-hover:scale-105 transition-transform">
              <Wrench className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-2xl tracking-wider leading-none text-teal-950 dark:text-white font-black">
                VSCMS<span className="text-yellow-signal">.</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-teal-700 dark:text-teal-300">
                Precision Auto Care
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-yellow-signal transition">
              Services
            </a>
            <a href="#benefits" className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-yellow-signal transition">
              Why Us
            </a>
            <a href="#how-it-works" className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-yellow-signal transition">
              How It Works
            </a>
            <a href="#testimonials" className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-yellow-signal transition">
              Testimonials
            </a>
            <a href="#contact" className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-yellow-signal transition">
              Contact
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />

            {isAuthenticated ? (
              <Button
                variant="primary"
                onClick={() => navigate(getDashboardPath())}
                icon={ArrowRight}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate('/login')}
                >
                  Login
                </Button>
                <Button
                  variant="outline"
                  className="bg-yellow-signal/15 dark:bg-yellow-signal/10 hover:bg-yellow-signal/25 text-teal-900 dark:text-yellow-signal border-yellow-signal/40 font-bold"
                  onClick={() => navigate('/register')}
                >
                  Register
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate('/login?tab=customer')}
                >
                  Book a Service
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-[#043433] border-b border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-xl">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold py-1 text-slate-800 dark:text-white"
            >
              Services
            </a>
            <a
              href="#benefits"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold py-1 text-slate-800 dark:text-white"
            >
              Why Us
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold py-1 text-slate-800 dark:text-white"
            >
              How It Works
            </a>
            <a
              href="#testimonials"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold py-1 text-slate-800 dark:text-white"
            >
              Testimonials
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold py-1 text-slate-800 dark:text-white"
            >
              Contact
            </a>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-3">
              {isAuthenticated ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(getDashboardPath());
                  }}
                  className="w-full"
                >
                  My Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/login');
                    }}
                    className="w-full"
                  >
                    Login
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/register');
                    }}
                    className="w-full bg-yellow-signal/15 dark:bg-yellow-signal/10 text-teal-900 dark:text-yellow-signal border-yellow-signal/40 font-bold"
                  >
                    Register
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/login?tab=customer');
                    }}
                    className="w-full"
                  >
                    Book a Service
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* 10. DARK FOOTER (#0A0F0F) */}
      <footer className="bg-[#0A0F0F] text-slate-300 pt-16 pb-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800/80">
            {/* Brand column */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-yellow-signal flex items-center justify-center text-ink font-bold">
                  <Wrench className="w-5 h-5" />
                </div>
                <span className="font-display text-2xl tracking-wider text-white font-black">
                  VSCMS<span className="text-yellow-signal">.</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Engineered vehicle diagnostics, OEM genuine spare parts, and certified technician care. Experience effortless car maintenance with transparent pricing.
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-yellow-signal">
                <ShieldCheck className="w-4 h-4" />
                <span>ISO 9001:2026 Certified Center</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">
                Quick Navigation
              </h4>
              <Link to="/login?tab=customer" className="text-xs text-slate-400 hover:text-yellow-signal transition">
                Book a Service
              </Link>
              <Link to="/login" className="text-xs text-slate-400 hover:text-yellow-signal transition">
                Customer Portal
              </Link>
              <Link to="/login?tab=mechanic" className="text-xs text-slate-400 hover:text-yellow-signal transition">
                Mechanic Workbench
              </Link>
              <Link to="/login?tab=admin" className="text-xs text-slate-400 hover:text-yellow-signal transition">
                Administrative Suite
              </Link>
            </div>

            {/* Operating Hours */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">
                Service Center Hours
              </h4>
              <div className="flex items-start gap-2 text-xs text-slate-400">
                <Clock className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">Mon - Sat: 09:00 AM - 06:00 PM</p>
                  <p className="text-[11px] text-slate-500">Sunday: Emergency Breakdown Only</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-400 mt-2">
                <Phone className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">Toll-Free 24x7 Support</p>
                  <p className="text-yellow-signal font-mono">1800-200-VSCMS</p>
                </div>
              </div>
            </div>

            {/* Hub Location */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">
                Workshop Location
              </h4>
              <div className="flex items-start gap-2 text-xs text-slate-400">
                <MapPin className="w-4 h-4 text-yellow-signal shrink-0 mt-0.5" />
                <p>
                  Plot 42, Auto Hub Way, Tech Industrial Park, Hinjawadi Phase 2, Pune, Maharashtra 411057
                </p>
              </div>
              <div className="pt-2">
                <Squiggle className="w-24 text-yellow-signal/60" />
              </div>
            </div>
          </div>

          {/* Copyright & Disclaimer */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© {new Date().getFullYear()} VSCMS. All rights reserved.</p>
            <p className="flex items-center gap-4">
              <span>Deep Teal + Signal Yellow Design System</span>
              <span>•</span>
              <span>Fully Responsive</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
