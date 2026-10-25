import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { getRoleFromToken, isTokenExpired, getDashboardForRole } from '@/utils/jwt';

export default function Home() {
  const { user, token, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (token && !isTokenExpired(token)) {
        const verifiedRole = getRoleFromToken(token) || user?.role;
        if (verifiedRole === 'alumno') {
          logout();
          router.replace('/login?error=alumno_no_web');
          return;
        }

        const destination = getDashboardForRole(verifiedRole);
        if (destination) {
          router.replace(destination);
        } else {
          router.replace('/login');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [token, user, isLoading, router, logout]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#172B4D]">
      <div className="flex flex-col items-center gap-4 text-white">
        <div className="w-10 h-10 border-4 border-[#A8D8C8] border-t-[#63B89F] rounded-full animate-spin"></div>
        <p className="text-sm font-medium tracking-wide">Iniciando CheckU...</p>
      </div>
    </div>
  );
}
