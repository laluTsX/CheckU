import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage if available
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('checku_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for automatic 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('checku_token');
        localStorage.removeItem('checku_user');
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Service (Multifunctional Unified Login)
// Auth Service (Unified Login & JWT Verification)
export const authApi = {
  login: async (identificador: string, password: string = '') => {
    const response = await apiClient.post('/auth/login', {
      identificador,
      password,
      origen: 'web',
    });
    return response.data;
  },
  verifyToken: async () => {
    const response = await apiClient.get('/auth/verify?origen=web');
    return response.data;
  },
  loginProfesor: async (matricula: string, password: string) => {
    const response = await apiClient.post('/auth/profesor/login', { matricula, password });
    return response.data;
  },
  loginAdmin: async (usuario: string, password: string) => {
    const response = await apiClient.post('/auth/admin/login', { usuario, password });
    return response.data;
  },
  loginAlumno: async (matricula: string) => {
    const response = await apiClient.post('/auth/alumno/login', { matricula });
    return response.data;
  },
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

// Admin Service (Teacher Registration & Management)
export const adminApi = {
  getProfesores: async () => {
    const response = await apiClient.get('/admin/profesores');
    return response.data;
  },
  createProfesor: async (data: { matricula: string; nombre: string; email?: string; password: string }) => {
    const response = await apiClient.post('/admin/profesores', data);
    return response.data;
  },
  updateProfesor: async (id: number | string, data: Partial<{ nombre: string; email: string; password: string }>) => {
    const response = await apiClient.put(`/admin/profesores/${id}`, data);
    return response.data;
  },
  deleteProfesor: async (id: number | string) => {
    const response = await apiClient.delete(`/admin/profesores/${id}`);
    return response.data;
  },
  getStats: async () => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },
};

// Teacher / Management Service
export const profesorApi = {
  getGrupos: async () => {
    const response = await apiClient.get('/profesor/grupos');
    return response.data;
  },
  createGrupo: async (data: {
    nombre_materia: string;
    codigo_grupo: string;
    horario: string;
    aula?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    dias_semana?: string;
    hora_inicio?: string;
    hora_fin?: string;
  }) => {
    const response = await apiClient.post('/profesor/grupos', data);
    return response.data;
  },
  getGrupoDetalle: async (id: number | string) => {
    const response = await apiClient.get(`/profesor/grupos/${id}`);
    return response.data;
  },
  updateGrupo: async (
    id: number | string,
    data: Partial<{
      nombre_materia: string;
      codigo_grupo: string;
      horario: string;
      aula: string;
      fecha_inicio: string;
      fecha_fin: string;
      dias_semana: string;
      hora_inicio: string;
      hora_fin: string;
    }>
  ) => {
    const response = await apiClient.put(`/profesor/grupos/${id}`, data);
    return response.data;
  },
  deleteGrupo: async (id: number | string) => {
    const response = await apiClient.delete(`/profesor/grupos/${id}`);
    return response.data;
  },
  addAlumnoToGrupo: async (
    grupoId: number | string,
    data: { matricula: string; nombre?: string; carrera?: string; email?: string }
  ) => {
    const response = await apiClient.post(`/profesor/grupos/${grupoId}/alumnos`, data);
    return response.data;
  },
  batchAddAlumnosToGrupo: async (
    grupoId: number | string,
    data: { alumno_ids?: number[]; matriculas?: string[] }
  ) => {
    const response = await apiClient.post(`/profesor/grupos/${grupoId}/alumnos`, data);
    return response.data;
  },
  removeAlumnoFromGrupo: async (grupoId: number | string, alumnoId: number | string) => {
    const response = await apiClient.delete(`/profesor/grupos/${grupoId}/alumnos/${alumnoId}`);
    return response.data;
  },
  getAlumnos: async () => {
    const response = await apiClient.get('/profesor/alumnos');
    return response.data;
  },
  createAlumno: async (data: { matricula: string; nombre: string; carrera?: string; email?: string }) => {
    const response = await apiClient.post('/profesor/alumnos', data);
    return response.data;
  },
  updateAlumno: async (
    id: number | string,
    data: Partial<{ matricula: string; nombre: string; carrera: string; email: string }>
  ) => {
    const response = await apiClient.put(`/profesor/alumnos/${id}`, data);
    return response.data;
  },
  deleteAlumno: async (id: number | string) => {
    const response = await apiClient.delete(`/profesor/alumnos/${id}`);
    return response.data;
  },
  getMetricas: async () => {
    const response = await apiClient.get('/profesor/metricas');
    return response.data;
  },
  getReportes: async (grupoId?: number | string) => {
    const params = grupoId ? { grupo_id: grupoId } : {};
    const response = await apiClient.get('/profesor/reportes', { params });
    return response.data;
  },
};

// Dynamic QR Attendance Service
export const qrApi = {
  generarQR: async (grupo_id: number | string, minutos_vigencia?: number) => {
    const payload: any = { grupo_id };
    if (minutos_vigencia) payload.minutos_vigencia = minutos_vigencia;
    const response = await apiClient.post('/qr/generar', payload);
    return response.data;
  },
  getSesionAsistencias: async (token_qr: string) => {
    const response = await apiClient.get(`/qr/sesion/${token_qr}/asistencias`);
    return response.data;
  },
  cerrarSesionQR: async (token_qr: string) => {
    const response = await apiClient.post(`/qr/cerrar/${token_qr}`);
    return response.data;
  },
  escanearQR: async (token_qr: string, matricula: string) => {
    const response = await apiClient.post('/qr/escanear', { token_qr, matricula });
    return response.data;
  },
};

// Justificantes & Absence Recovery Service
export const justificantesApi = {
  subirJustificante: async (formData: FormData) => {
    const response = await apiClient.post('/justificantes/subir', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getJustificantesGrupo: async (grupoId: number | string) => {
    const response = await apiClient.get(`/justificantes/grupo/${grupoId}`);
    return response.data;
  },
  getJustificantesAlumno: async () => {
    const response = await apiClient.get('/justificantes/alumno');
    return response.data;
  },
  aprobarJustificante: async (justificanteId: number | string) => {
    const response = await apiClient.post(`/justificantes/${justificanteId}/aprobar`);
    return response.data;
  },
  rechazarJustificante: async (justificanteId: number | string) => {
    const response = await apiClient.post(`/justificantes/${justificanteId}/rechazar`);
    return response.data;
  },
  eliminarJustificante: async (justificanteId: number | string) => {
    const response = await apiClient.delete(`/justificantes/${justificanteId}`);
    return response.data;
  },
};

// Alumno Service
export const alumnoApi = {
  getHorario: async () => {
    const response = await apiClient.get('/alumno/horario');
    return response.data;
  },
  getAsistencias: async () => {
    const response = await apiClient.get('/alumno/asistencias');
    return response.data;
  },
  getPerfil: async () => {
    const response = await apiClient.get('/alumno/perfil');
    return response.data;
  },
};

export default apiClient;
