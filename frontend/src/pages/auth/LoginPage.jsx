// Login Page
// First screen any user sees.
// Bold industrial design — charcoal left panel, white right form.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — brand ── */}
      <div className="hidden lg:flex w-1/2 bg-brand-charcoal flex-col justify-between p-12">
        <div>
          <h1 className="font-display text-5xl font-bold text-white tracking-wide">
            HARDWARE<span className="text-brand-orange">OS</span>
          </h1>
          <p className="text-gray-400 mt-3 text-lg">
            Complete store management for hardware retailers.
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-4">
          {[
            { icon: '⊙', text: 'Point of sale with M-Pesa support' },
            { icon: '⊟', text: 'Real-time inventory across branches' },
            { icon: '⊘', text: 'Supplier & purchase order management' },
            { icon: '⊞', text: 'Live dashboard & profit reports' },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-3">
              <span className="text-brand-orange text-xl">{f.icon}</span>
              <span className="text-gray-300 text-sm">{f.text}</span>
            </div>
          ))}
        </div>

        <p className="text-gray-600 text-xs">
          © 2026 HardwareOS. Built for Kenyan hardware retailers.
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <h1 className="font-display text-4xl font-bold text-brand-charcoal">
              HARDWARE<span className="text-brand-orange">OS</span>
            </h1>
          </div>

          <h2 className="font-display text-3xl font-bold text-brand-charcoal mb-1">
            Sign in
          </h2>
          <p className="text-brand-gray text-sm mb-8">
            Enter your credentials to access your store
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="jane@yourstore.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-brand-gray mt-8 text-center">
            Contact your administrator to create an account.
          </p>
        </div>
      </div>
    </div>
  );
}