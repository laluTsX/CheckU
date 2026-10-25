import React, { createContext, useContext, useState } from 'react';
import { mobileApi, setAuthToken } from '../services/api';

export interface MobileUser {
  id: number;
  matricula: string;
  nombre: string;
  email?: string;
  carrera?: string;
  role: 'alumno' | 'profesor';
}

interface AuthContextType {
  user: MobileUser | null;
  token: string | null;
  isLoading: boolean;
  loginAlumno: (matricula: string) => Promise<{ success: boolean; message?: string }>;
  loginProfesor: (matricula: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loginAlumno = async (matricula: string) => {
    setIsLoading(true);
    try {
      const res = await mobileApi.loginAlumno(matricula);
      if (res.success && res.access_token) {
        setAuthToken(res.access_token);
        setToken(res.access_token);
        setUser(res.user);
        return { success: true };
      }
      return { success: false, message: res.message || 'Error al iniciar sesión' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error de conexión' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginProfesor = async (matricula: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await mobileApi.loginProfesor(matricula, password);
      if (res.success && res.access_token) {
        setAuthToken(res.access_token);
        setToken(res.access_token);
        setUser(res.user);
        return { success: true };
      }
      return { success: false, message: res.message || 'Credenciales inválidas' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error de conexión' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        loginAlumno,
        loginProfesor,
        logout,
      }}
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
