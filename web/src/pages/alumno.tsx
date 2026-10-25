import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import {
  Smartphone,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Lock
} from 'lucide-react';

export default function AlumnoPage() {
  const { user, token, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (token && user) {
      if (user.role === 'admin') {
        router.replace('/admin');
      } else if (user.role === 'profesor') {
        router.replace('/dashboard');
      }
    }
  }, [user, token, router]);

  const handleGoLogin = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D1828] via-[#172B4D] to-[#0D1828] flex items-center justify-center p-4">
      <Head>
        <title>Acceso Móvil para Alumnos • CheckU</title>
        <link rel="icon" href="/logo.png" />
      </Head>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 text-center relative overflow-hidden">
        {/* Accent Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#63B89F] via-[#A8D8C8] to-[#63B89F]" />

        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600">
          <Smartphone className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-[#172B4D] mb-2">
          Acceso Exclusivo en App Móvil
        </h1>

        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          Por disposición institucional de <strong>CheckU</strong>, los alumnos no tienen acceso al portal web. Las asistencias, horarios, códigos QR y justificantes de falta se gestionan exclusivamente desde la <strong>aplicación móvil</strong>.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left mb-6 space-y-2.5 text-xs text-slate-700">
          <div className="flex items-center gap-2 font-semibold text-[#172B4D]">
            <CheckCircle2 className="w-4 h-4 text-[#63B89F]" />
            <span>Escaneo de código QR de asistencia en clase</span>
          </div>
          <div className="flex items-center gap-2 font-semibold text-[#172B4D]">
            <CheckCircle2 className="w-4 h-4 text-[#63B89F]" />
            <span>Subida de comprobantes médicos / justificantes</span>
          </div>
          <div className="flex items-center gap-2 font-semibold text-[#172B4D]">
            <CheckCircle2 className="w-4 h-4 text-[#63B89F]" />
            <span>Consulta de porcentaje y regla del 20%</span>
          </div>
        </div>

        <button
          onClick={handleGoLogin}
          className="w-full bg-[#172B4D] hover:bg-[#0D1828] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
        >
          <span>Ir al Portal Docente / Admin</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-xs text-gray-400 mt-5">
          CheckU • Sistema Universitario de Asistencia
        </p>
      </div>
    </div>
  );
}
