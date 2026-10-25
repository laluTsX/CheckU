import { Platform } from 'react-native';

// Tu IP local detectada en la red Wi-Fi: 192.168.1.76
const DEFAULT_URL = 'http://192.168.1.76:5000/api';

let currentBaseUrl = DEFAULT_URL;
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const setCustomApiUrl = (url: string) => {
  currentBaseUrl = url.trim().replace(/\/$/, '');
};

export const getApiUrl = () => currentBaseUrl;

async function request(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Candidate URLs to try (primary currentBaseUrl, and alternative between Wi-Fi and USB adb reverse)
  const candidateUrls = [
    currentBaseUrl,
    currentBaseUrl.includes('192.168.') ? 'http://127.0.0.1:5000/api' : 'http://192.168.1.76:5000/api',
  ];

  let lastError: any = null;

  for (const baseUrl of candidateUrls) {
    const url = `${baseUrl}${endpoint}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          code: data.code || 'HTTP_ERROR',
          message: data.message || `Error ${response.status}`,
          data,
        };
      }

      // If alternative succeeded, save as current
      if (baseUrl !== currentBaseUrl) {
        currentBaseUrl = baseUrl;
      }

      return {
        success: true,
        status: response.status,
        ...data,
      };
    } catch (error: any) {
      lastError = error;
    }
  }

  return {
    success: false,
    code: 'NETWORK_ERROR',
    message: `No se pudo conectar al servidor CheckU (${currentBaseUrl}). Verifica que el backend esté encendido en tu PC.`,
    error: lastError?.message,
  };
}

export const mobileApi = {
  // Auth
  loginAlumno: async (matricula: string) => {
    return request('/auth/alumno/login', {
      method: 'POST',
      body: JSON.stringify({ matricula: matricula.trim().toUpperCase() }),
    });
  },

  loginProfesor: async (matricula: string, password: string) => {
    return request('/auth/profesor/login', {
      method: 'POST',
      body: JSON.stringify({ matricula: matricula.trim(), password }),
    });
  },

  getMe: async () => {
    return request('/auth/me', { method: 'GET' });
  },

  // Alumno
  getHorario: async () => {
    return request('/alumno/horario', { method: 'GET' });
  },

  getAsistencias: async () => {
    return request('/alumno/asistencias', { method: 'GET' });
  },

  // QR Scanning & 3-Digit PIN Attendance
  escanearQR: async (token_o_pin: string, matricula: string) => {
    const raw = (token_o_pin || '').trim();
    const isPin = raw.length <= 4 && /^\d+$/.test(raw);
    return request('/qr/escanear', {
      method: 'POST',
      body: JSON.stringify({
        token_qr: isPin ? '' : raw,
        codigo_pin: isPin ? raw : '',
        matricula: matricula.trim().toUpperCase(),
      }),
    });
  },

  // Docente
  getGruposDocente: async () => {
    return request('/profesor/grupos', { method: 'GET' });
  },

  getGrupoDetalle: async (grupo_id: number | string) => {
    return request(`/profesor/grupos/${grupo_id}`, { method: 'GET' });
  },

  getReportes: async (grupo_id?: number | string) => {
    const query = grupo_id ? `?grupo_id=${grupo_id}` : '';
    return request(`/profesor/reportes${query}`, { method: 'GET' });
  },

  generarQR: async (grupo_id: number | string, minutos_vigencia: number = 10) => {
    return request('/qr/generar', {
      method: 'POST',
      body: JSON.stringify({ grupo_id, minutos_vigencia }),
    });
  },

  cerrarSesionQR: async (token_qr: string) => {
    return request(`/qr/cerrar/${token_qr}`, {
      method: 'POST',
    });
  },

  getSesionAsistencias: async (token_qr: string) => {
    return request(`/qr/sesion/${token_qr}/asistencias`, { method: 'GET' });
  },
};

export default mobileApi;
