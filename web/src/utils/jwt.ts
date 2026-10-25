export interface JwtPayload {
  sub?: string;
  role?: 'admin' | 'profesor' | 'alumno' | string;
  id?: number;
  nombre?: string;
  email?: string;
  usuario?: string;
  matricula?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * Decodifica y extrae el payload de un token JWT en formato Base64URL.
 */
export function decodeJwt(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload) as JwtPayload;
  } catch (err) {
    console.error('[CheckU JWT] Error decodificando token:', err);
    return null;
  }
}

/**
 * Valida si el token JWT ha expirado según el claim 'exp'.
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return true;

  // exp viene en segundos UNIX
  const expirationMs = payload.exp * 1000;
  // Margen de 5 segundos para evitar race conditions
  return expirationMs <= Date.now() + 5000;
}

/**
 * Obtiene y valida el rol institucional contenido en el JWT.
 */
export function getRoleFromToken(token: string): 'admin' | 'profesor' | 'alumno' | null {
  const payload = decodeJwt(token);
  if (!payload || !payload.role) return null;

  const role = String(payload.role).toLowerCase();
  if (role === 'admin' || role === 'administrador') return 'admin';
  if (role === 'profesor' || role === 'docente') return 'profesor';
  if (role === 'alumno' || role === 'estudiante') return 'alumno';

  return null;
}

/**
 * Determina el dashboard correspondiente según la verificación del rol en el JWT.
 * Notar que 'alumno' no tiene dashboard web (acceso exclusivo por app móvil).
 */
export function getDashboardForRole(role?: string | null): string | null {
  if (!role) return null;
  const normalized = role.toLowerCase();
  if (normalized === 'admin' || normalized === 'administrador') return '/admin';
  if (normalized === 'profesor' || normalized === 'docente') return '/dashboard';
  return null;
}
