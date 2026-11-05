import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiClient } from '../api/client';
import { X, Lock, Mail, User, Phone, Shield } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { authModalOpen, setAuthModalOpen, setUser, notify } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isRegister) {
      const res = await apiClient.register(fullName, email, phone, password);
      setLoading(false);
      if (res.success && res.user) {
        setUser(res.user);
        setAuthModalOpen(false);
        notify(`Registration successful! Welcome, ${res.user.full_name}`, 'success');
      } else {
        notify(res.error || 'Registration failed', 'error');
      }
    } else {
      const res = await apiClient.login(email, password);
      setLoading(false);
      if (res.success && res.user) {
        setUser(res.user);
        setAuthModalOpen(false);
        notify(`Welcome back, ${res.user.full_name}!`, 'success');
      } else {
        notify(res.error || 'Login failed', 'error');
      }
    }
  };

  const handleDemoFill = (role: 'admin' | 'passenger') => {
    setIsRegister(false);
    if (role === 'admin') {
      setEmail('admin@demo.com');
      setPassword('admin123');
    } else {
      setEmail('user@demo.com');
      setPassword('user123');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-300 select-none">
        {/* Header */}
        <div className="bg-[#0B2E5C] text-white p-4 flex items-center justify-between border-b-4 border-[#F57C00]">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">
              {isRegister ? 'Passenger Registration' : 'SkyLedger Portal Authentication'}
            </h3>
          </div>
          <button
            onClick={() => setAuthModalOpen(false)}
            className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Fast Fill Buttons */}
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs">
          <div className="font-bold text-amber-900 mb-1.5">Quick Demo Fill:</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoFill('admin')}
              className="py-1 px-2 bg-[#0B2E5C] hover:bg-blue-900 text-white rounded font-semibold text-[11px]"
            >
              Admin (admin@demo.com)
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('passenger')}
              className="py-1 px-2 bg-[#F57C00] hover:bg-orange-600 text-white rounded font-semibold text-[11px]"
            >
              Passenger (user@demo.com)
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {isRegister && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#0B2E5C] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-0123"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#0B2E5C] focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#0B2E5C] focus:outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#0B2E5C] focus:outline-none font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#0B2E5C] hover:bg-blue-900 text-white font-bold rounded shadow transition-colors text-sm"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-[#0B2E5C] hover:underline font-semibold"
            >
              {isRegister
                ? 'Already have an account? Sign In instead'
                : "Don't have an account? Register here"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
