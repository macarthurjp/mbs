import React, { useState } from 'react';
import { Sparkles, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function LoginPage() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(username, password);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-pink-50 to-gray-50 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-gray-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-8 py-10">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Sparkles size={32} className="text-pink-400" />
              </div>
            </div>
            <h1 className="text-3xl font-serif font-bold text-white text-center mb-2">
              KIERO QUE ME MIRES
            </h1>
            <p className="text-gray-300 text-center text-sm uppercase tracking-widest">
              Indumentaria Femenina
            </p>
          </div>

          <div className="px-8 py-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <Input
                  label="Usuario"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  required
                  disabled={loading}
                  autoComplete="username"
                />

                <div className="relative">
                  <Input
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Iniciando sesión...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <LogIn size={20} />
                    Iniciar Sesión
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Sistema de gestión para indumentaria femenina
        </p>
      </div>
    </div>
  );
}
