import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Detecta dinámicamente la IP de la computadora que corre Expo Metro Bundler.
 * Si el teléfono escanea el QR en la terminal, Expo conoce exactamente la IP del host.
 */
export function getDetectedServerHost(): string {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest?.debuggerHost ||
      (Constants as any).manifest2?.extra?.expoClient?.hostUri;

    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    }
  } catch (e) {
    // ignore
  }

  // IP actual detectada en la tarjeta Wi-Fi de esta PC
  return '10.172.251.161';
}

const detectedHost = getDetectedServerHost();
const DEFAULT_URL = `http://${detectedHost}:5000/api`;

let currentBaseUrl = DEFAULT_URL;
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const setCustomApiUrl = (url: string) => {
  currentBaseUrl = url.trim().replace(/\/$/, '');
};

export const getApiUrl = () => currentBaseUrl;

/**
 * Retorna la lista ordenada de URLs candidatas a probar
 */
function getCandidateUrls(): string[] {
  const detected = getDetectedServerHost();
  const list = [
    currentBaseUrl,
    `http://${detected}:5000/api`,
    'http://10.172.251.161:5000/api',
    'http://192.168.137.1:5000/api',
    Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : null,
    'http://127.0.0.1:5000/api',
  ].filter(Boolean) as string[];

  return Array.from(new Set(list));
}

async function request(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const candidateUrls = getCandidateUrls();
  let lastError: any = null;

  for (const baseUrl of candidateUrls) {
    const url = `${baseUrl}${endpoint}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

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

      // Conexión exitosa: guardar como URL base activa
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
    message: `No se pudo conectar con el servidor CheckU. Intentado en: ${currentBaseUrl}. Asegúrate de que el teléfono y la PC estén en la misma red Wi-Fi y que el backend esté corriendo.`,
    error: lastError?.message,
  };
}

export const mobileApi = {
  // Test Connectivity
  checkHealth: async () => {
    return request('/health', { method: 'GET' });
  },

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
