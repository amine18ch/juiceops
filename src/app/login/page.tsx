'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';
import { Eye, EyeOff, LogIn, ChevronDown } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    role: 'Opérateur',
    email: 'operateur@juiceops.fr',
    password: 'juiceops123',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    dot: 'bg-blue-500',
    description: 'Saisie des données',
  },
  {
    role: 'Resp. Qualité',
    email: 'qualite@juiceops.fr',
    password: 'juiceops123',
    color: 'bg-teal-50 border-teal-200 text-teal-700',
    dot: 'bg-teal-500',
    description: 'Validation + anomalies',
  },
  {
    role: 'Manager Production',
    email: 'manager@juiceops.fr',
    password: 'juiceops123',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    dot: 'bg-orange-500',
    description: 'Suivi global',
  },
  {
    role: 'Direction',
    email: 'direction@juiceops.fr',
    password: 'juiceops123',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    dot: 'bg-purple-500',
    description: 'Dashboard + KPI',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setShowDemo(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-8 py-8 text-center">
            <div className="flex justify-center mb-3">
              <div className="bg-white/20 rounded-xl p-2">
                <AppLogo size={40} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">JuiceOps</h1>
            <p className="text-teal-100 text-sm mt-1">Gestion de production de jus</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-lg font-semibold text-zinc-800 mb-6">Connexion</h2>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Adresse email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="votre@email.fr"
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-10 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn size={16} />
                )}
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowDemo(!showDemo)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-sm text-zinc-600 transition-colors"
              >
                <span className="font-medium">Comptes de démonstration</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${showDemo ? 'rotate-180' : ''}`}
                />
              </button>

              {showDemo && (
                <div className="mt-2 space-y-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => fillDemo(acc)}
                      className={`w-full flex items-center gap-3 px-4 py-3 border rounded-lg text-left transition-all hover:shadow-sm ${acc.color}`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${acc.dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm">{acc.role}</p>
                        <p className="text-xs opacity-75 truncate">{acc.email}</p>
                      </div>
                      <span className="text-xs opacity-60 shrink-0">{acc.description}</span>
                    </button>
                  ))}
                  <p className="text-center text-xs text-zinc-400 pt-1">
                    Mot de passe : <span className="font-mono font-semibold">juiceops123</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
