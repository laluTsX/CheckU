import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { authApi } from '@/services/api';
import { decodeJwt, isTokenExpired, getRoleFromToken, getDashboardForRole } from '@/utils/jwt';

export interface User {
  id: number;
  matricula?: string;
  usuario?: string;
  nombre: string;
  email?: string;
  carrera?: string;
  role: 'profesor' | 'admin' | 'alumno';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identificador: string, password?: string) => Promise<void>;
  logout: () => void;
  routeByRole: (role?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem('checku_token');
    const savedUser = localStorage.getItem('checku_user');

    if (savedToken && savedUser) {
      try {
        // Verificar validez del JWT
        if (isTokenExpired(savedToken)) {
          localStorage.removeItem('checku_token');
          localStorage.removeItem('checku_user');
          setToken(null);
          setUser(null);
        } else {
          // Extraer rol directamente del JWT
          const role = getRoleFromToken(savedToken);
          // Si es alumno, en la web no tiene acceso
          if (role === 'alumno') {
            localStorage.removeItem('checku_token');
            localStorage.removeItem('checku_user');
            setToken(null);
            setUser(null);
          } else {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
          }
        }
      } catch {
        localStorage.removeItem('checku_token');
        localStorage.removeItem('checku_user');
        setToken(null);
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  const routeByRole = (role?: string) => {
    const destination = getDashboardForRole(role);
    if (destination) {
      router.push(destination);
    } else {
      router.push('/login');
    }
  };

  const login = async (identificador: string, password: string = '') => {
    setIsLoading(true);
    try {
      const data = await authApi.login(identificador.trim(), password.trim());
      if (data.success && data.access_token) {
        const receivedToken = data.access_token;

        // 1. Verificación del JWT
        if (isTokenExpired(receivedToken)) {
          throw new Error('El token de autenticación no es válido o ha expirado.');
        }

        // 2. Extraer y verificar el rol en los claims del JWT
        const tokenRole = getRoleFromToken(receivedToken) || data.role;

        // 3. Regla estricta: Los alumnos no tienen acceso al portal web
        if (tokenRole === 'alumno') {
          localStorage.removeItem('checku_token');
          localStorage.removeItem('checku_user');
          throw new Error(
            'El acceso para alumnos es exclusivo mediante la aplicación móvil CheckU. El portal web está reservado para Docentes y Administradores.'
          );
        }

        // 4. Determinar el dashboard según la verificación JWT
        const destination = getDashboardForRole(tokenRole);
        if (!destination) {
          throw new Error('Rol institucional no autorizado para acceder al portal web.');
        }

        // 5. Guardar credenciales validadas
        localStorage.setItem('checku_token', receivedToken);
        localStorage.setItem('checku_user', JSON.stringify(data.user));
        setToken(receivedToken);
        setUser(data.user);

        // 6. Redirigir al dashboard respectivo
        router.push(destination);
      } else {
        throw new Error(data.message || 'No fue posible iniciar sesión.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('checku_token');
    localStorage.removeItem('checku_user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, logout, routeByRole }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
