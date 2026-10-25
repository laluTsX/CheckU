import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import {
  Lock,
  UserCheck,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Smartphone
} from 'lucide-react';

export default function Login() {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { login, token, user, isLoading } = useAuth();
  const router = useRouter();

  // Si ya tiene una sesión iniciada válida, redirigir a su dashboard
  React.useEffect(() => {
    if (!isLoading && token && user) {
      if (user.role === 'admin') {
        router.replace('/admin');
      } else if (user.role === 'profesor') {
        router.replace('/dashboard');
      }
    }
  }, [isLoading, token, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificador.trim()) {
      setError('Por favor ingresa tu matrícula o usuario institucional.');
      return;
    }
    if (!password.trim()) {
      setError('Por favor ingresa tu contraseña.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login(identificador.trim(), password.trim());
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Error al iniciar sesión. Verifica tus credenciales de acceso.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D1828] via-[#172B4D] to-[#0D1828] flex items-center justify-center p-4">
      <Head>
        <title>Iniciar Sesión • CheckU</title>
        <link rel="icon" href="/logo.png" />
      </Head>

      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 relative overflow-hidden">
          {/* Top colored accent bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#63B89F] via-[#A8D8C8] to-[#63B89F]" />

          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-20 h-20 rounded-2xl bg-[#172B4D] p-2 flex items-center justify-center shadow-lg mb-3 border border-slate-700/50">
              {!logoError ? (
                <img
                  src="/assets/logo.png"
                  alt="CheckU Logo"
                  className="w-full h-full object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <CheckCircle2 className="w-10 h-10 text-[#63B89F]" />
              )}
            </div>
            <h1 className="text-2xl font-black text-[#172B4D] tracking-tight">
              Check<span className="text-[#63B89F]">U</span>
            </h1>
            <p className="text-xs font-bold text-[#6F7F8A] uppercase tracking-wider mt-0.5">
              Portal Institucional Docente y Administrativo
            </p>
          </div>

          {/* Error alerts */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {router.query.error === 'alumno_no_web' && !error && (
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
              <Smartphone className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <span className="leading-relaxed font-medium">
                El acceso para alumnos es exclusivo a través de la aplicación móvil CheckU. El portal web está reservado para Docentes y Administradores.
              </span>
            </div>
          )}

          {router.query.expired && !error && (
            <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Tu sesión ha expirado. Por favor inicia sesión nuevamente.</span>
            </div>
          )}

          {/* Form: Direct login with Matrícula & Contraseña only */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-1.5">
                Matrícula o Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F7F8A]">
                  <UserCheck className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="Ej. DOC-202401 o admin"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-[#172B4D] focus:ring-2 focus:ring-[#63B89F] focus:border-transparent outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F7F8A]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-[#172B4D] focus:ring-2 focus:ring-[#63B89F] focus:border-transparent outline-none transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-[#172B4D] transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-[#63B89F] hover:bg-[#52a78e] text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <span className="flex items-center gap-2">
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          {/* Student notice */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center gap-2.5 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl">
            <Smartphone className="w-5 h-5 text-[#63B89F] flex-shrink-0" />
            <p className="leading-snug">
              <span className="font-bold text-gray-700">¿Eres alumno?</span> El acceso a asistencias y justificantes es exclusivo desde la app móvil.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-gray-400 mt-6">
          CheckU • Sistema de Control de Asistencia Universitario
        </p>
      </div>
    </div>
  );
}
