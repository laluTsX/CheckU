import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User, Bell, CheckCircle2 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [imgError, setImgError] = useState(false);

  const homeHref = user?.role === 'admin' ? '/admin' : '/dashboard';
  const roleLabel = user?.role === 'admin' ? 'Panel Administrador' : 'Panel Docente';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href={homeHref} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-[#172B4D] p-1 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform overflow-hidden border border-slate-700/50">
                {!imgError ? (
                  <img
                    src="/assets/logo.png"
                    alt="CheckU"
                    className="w-full h-full object-contain"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-[#63B89F]" />
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black text-[#172B4D] tracking-tight">Check</span>
                  <span className="text-xl font-black text-[#63B89F] tracking-tight">U</span>
                </div>
                <span className="text-[10px] uppercase font-semibold text-[#6F7F8A] tracking-wider -mt-1">
                  {roleLabel}
                </span>
              </div>
            </Link>
          </div>

          {/* Right section: user profile & logout */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-[#F8FAFC] border border-gray-200 py-1.5 px-3 rounded-full">
              <div className="w-7 h-7 rounded-full bg-[#63B89F] text-white flex items-center justify-center font-bold text-xs">
                {user?.nombre ? user.nombre.charAt(0) : (user?.role === 'admin' ? 'A' : 'D')}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-[#172B4D]">{user?.nombre || 'Usuario'}</span>
                <span className="text-[10px] text-[#6F7F8A] font-mono">{user?.usuario || user?.matricula}</span>
              </div>
              <span className={`ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                user?.role === 'admin'
                  ? 'bg-[#172B4D] text-[#A8D8C8]'
                  : user?.role === 'alumno'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-[#A8D8C8] text-[#172B4D]'
              }`}>
                {user?.role === 'admin' ? 'Administrador' : user?.role === 'alumno' ? 'Alumno' : 'Docente'}
              </span>
            </div>

            <button
              onClick={logout}
              title="Cerrar sesión"
              className="flex items-center gap-1.5 text-xs text-[#6F7F8A] hover:text-red-600 bg-gray-50 hover:bg-red-50 p-2 rounded-lg border border-gray-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
