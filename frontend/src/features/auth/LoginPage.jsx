import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Wrench, Shield, Car, ArrowRight, Lock, Mail } from 'lucide-react';
import { Button, Input, Card, ThemeToggle, Squiggle } from '../../shared/ui';
import { useAuth } from '../../app/context/AuthContext';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [role, setRole] = useState(() => searchParams.get('tab') || 'customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['customer', 'mechanic', 'admin', 'center', 'platform'].includes(tabParam)) {
      setRole(tabParam);
    }
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      const user = await login(email, password, role);
      toast.success(`Welcome back, ${user.Name}!`);

      if (user.Role === 'platform_admin') {
        navigate('/platform');
      } else if (user.Role === 'admin' || user.Role === 'center') {
        navigate('/admin/dashboard');
      } else if (user.Role === 'mechanic') {
        navigate('/mechanic');
      } else {
        // Customer: Check if location is set
        const hasLocation = Boolean((user.City && user.Area) || (user.city && user.area));
        const plate = searchParams.get('plate');
        if (!hasLocation) {
          navigate(plate ? `/customer/location?plate=${plate}` : '/customer/location');
        } else {
          navigate(plate ? `/customer/book?plate=${plate}` : '/customer/centers');
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Invalid email or password';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFA] dark:bg-[#022828] text-slate-900 dark:text-slate-100">
      {/* Top Bar */}
      <div className="p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-900 dark:bg-yellow-signal flex items-center justify-center text-yellow-signal dark:text-ink font-bold shadow">
            <Wrench className="w-5 h-5" />
          </div>
          <span className="font-display text-2xl tracking-wider text-teal-950 dark:text-white font-black">
            VSCMS<span className="text-yellow-signal">.</span>
          </span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Login Card Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 md:p-10 bg-white dark:bg-slate-900 shadow-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Sign In to VSCMS
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select your role and enter your account credentials
            </p>
          </div>

          {/* Role Toggle Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => setRole('customer')}
              className={`flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                role === 'customer'
                  ? 'bg-signal-yellow text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Car className="w-3 h-3" />
              <span>Customer</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('center')}
              className={`flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                role === 'center' || role === 'admin'
                  ? 'bg-signal-yellow text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3 h-3" />
              <span>Center</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('mechanic')}
              className={`flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                role === 'mechanic'
                  ? 'bg-signal-yellow text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Wrench className="w-3 h-3" />
              <span>Mechanic</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('platform_admin')}
              className={`flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                role === 'platform_admin'
                  ? 'bg-signal-yellow text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3 h-3" />
              <span>Platform</span>
            </button>
          </div>


          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              placeholder="e.g. name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
              icon={ArrowRight}
            >
              Sign In as {role.charAt(0).toUpperCase() + role.slice(1)}
            </Button>
          </form>

          {/* Universal Register Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Need an account?{' '}
              <Link to="/register" className="font-bold text-teal-700 dark:text-yellow-signal hover:underline">
                Register as Customer, Workshop, or Mechanic →
              </Link>
            </p>
          </div>
        </Card>
      </div>

      {/* Footer Info */}
      <div className="p-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} VSCMS. Multi-Role Automotive Management Platform.
      </div>
    </div>
  );
}
