import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, fullWidth = false }) => {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  const isLoginPage = router.pathname === '/login';

  useEffect(() => {
    if (!isLoading) {
      if (!token || !user) {
        if (!isLoginPage) {
          router.replace('/login');
        }
      } else {
        if (user.role === 'alumno') {
          router.replace('/login?error=alumno_no_web');
        } else if (user.role === 'profesor' && router.pathname.startsWith('/admin')) {
          router.replace('/dashboard');
        }
      }
    }
  }, [isLoading, token, user, router, isLoginPage]);

  // Pantalla de carga mientras se verifica el token
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-[#A8D8C8] border-t-[#63B89F] rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-[#172B4D]">Cargando CheckU...</span>
        </div>
      </div>
    );
  }

  // Si no está autenticado y no está en login, no renderizar componentes protegidos
  if ((!token || !user) && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-[#A8D8C8] border-t-[#63B89F] rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-[#172B4D]">Redirigiendo al inicio de sesión...</span>
        </div>
      </div>
    );
  }

  // En la página de login, renderizar directo sin el layout de navegación
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Vista de proyector full-width
  if (fullWidth) {
    return <main className="min-h-screen bg-[#0D1828] text-white">{children}</main>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />
      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
