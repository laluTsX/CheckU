import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  QrCode,
  GraduationCap,
  CalendarClock,
  CheckCircle2,
  FileCheck2
} from 'lucide-react';

const adminNavigationItems = [
  { name: 'Gestión de Profesores', href: '/admin', icon: Users },
  { name: 'Salones y Cuatrimestre', href: '/grupos', icon: BookOpen },
  { name: 'Catálogo de Alumnos', href: '/alumnos', icon: GraduationCap },
];

const teacherNavigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Salones y Cuatrimestre', href: '/grupos', icon: BookOpen },
  { name: 'Catálogo Alumnos', href: '/alumnos', icon: Users },
  { name: 'Reportes de Asistencia', href: '/reportes', icon: BarChart3 },
];

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [imgError, setImgError] = useState(false);

  const isAdmin = user?.role === 'admin';
  const navigationItems = isAdmin ? adminNavigationItems : teacherNavigationItems;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex md:flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Navigation list */}
        <nav className="space-y-1.5">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#63B89F]/15 text-[#172B4D] border-l-4 border-[#63B89F]'
                    : 'text-[#6F7F8A] hover:bg-gray-50 hover:text-[#172B4D]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#63B89F]' : 'text-[#6F7F8A]'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Dynamic Card depending on role */}
        {isAdmin ? (
          <div className="bg-gradient-to-br from-[#172B4D] to-[#0D1828] text-white p-4 rounded-2xl shadow-sm border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-[#63B89F] flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-xs text-[#A8D8C8]">Panel Administrativo</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed mb-3">
              Administra la plantilla docente de la institución y supervisa el acceso.
            </p>
            <Link
              href="/admin"
              className="block w-full text-center bg-[#63B89F] hover:bg-[#52a78e] text-white font-semibold text-xs py-2 px-3 rounded-xl transition-colors shadow"
            >
              Ver Plantilla Docente
            </Link>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#172B4D] to-[#0D1828] text-white p-4 rounded-2xl shadow-sm border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-[#63B89F] flex items-center justify-center">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-xs text-[#A8D8C8]">Pase de Lista QR</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed mb-3">
              Inicia una sesión QR única para la clase actual que se renueva cada sesión.
            </p>
            <Link
              href="/grupos"
              className="block w-full text-center bg-[#63B89F] hover:bg-[#52a78e] text-white font-semibold text-xs py-2 px-3 rounded-xl transition-colors shadow"
            >
              Seleccionar Salón
            </Link>
          </div>
        )}
      </div>

      {/* Footer info with logo */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-2">
        <div className="w-5 h-5 rounded overflow-hidden">
          {!imgError ? (
            <img
              src="/assets/logo.png"
              alt="Logo"
              className="w-full h-full object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#63B89F]" />
          )}
        </div>
        <span className="text-[11px] text-[#6F7F8A] font-medium">
          CheckU • Sistema Universitario
        </span>
      </div>
    </aside>
  );
};

export default Sidebar;
