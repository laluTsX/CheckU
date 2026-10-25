import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { adminApi } from '@/services/api';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Hash,
  BookOpen,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  KeyRound,
  GraduationCap,
  Calendar
} from 'lucide-react';

interface ProfesorItem {
  id: number;
  matricula: string;
  nombre: string;
  email?: string;
  total_grupos: number;
  total_alumnos: number;
  grupos_lista?: Array<{ id: number; nombre_materia: string; codigo_grupo: string; aula: string }>;
  created_at?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [profesores, setProfesores] = useState<ProfesorItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal: Crear / Dar de alta a Profesor
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [matricula, setMatricula] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal: Editar Profesor
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProfesor, setEditingProfesor] = useState<ProfesorItem | null>(null);
  const [editMatricula, setEditMatricula] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profRes, statsRes] = await Promise.all([
        adminApi.getProfesores(),
        adminApi.getStats(),
      ]);
      if (profRes.success) setProfesores(profRes.profesores || []);
      if (statsRes.success) setStats(statsRes.stats || null);
    } catch (err) {
      console.error('Error al cargar datos de administración', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadData();
    }
  }, [user]);

  const handleCreateProfesor = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!matricula.trim() || !nombre.trim() || !password.trim()) {
      setErrorMessage('Matrícula, nombre completo y contraseña son campos obligatorios.');
      return;
    }

    try {
      setSaving(true);
      const res = await adminApi.createProfesor({
        matricula: matricula.trim().toUpperCase(),
        nombre: nombre.trim(),
        email: email.trim() || undefined,
        password: password.trim(),
      });

      if (res.success) {
        setSuccessMessage(`¡Profesor "${nombre.trim()}" dado de alta exitosamente!`);
        setIsCreateModalOpen(false);
        setMatricula('');
        setNombre('');
        setEmail('');
        setPassword('');
        loadData();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Error al registrar al docente.');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (p: ProfesorItem) => {
    setEditingProfesor(p);
    setEditMatricula(p.matricula);
    setEditNombre(p.nombre);
    setEditEmail(p.email || '');
    setEditPassword('');
    setErrorMessage('');
    setIsEditModalOpen(true);
  };

  const handleUpdateProfesor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfesor) return;
    if (!editMatricula.trim() || !editNombre.trim()) {
      setErrorMessage('Matrícula y nombre completo son requeridos.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      const data: any = {
        matricula: editMatricula.trim().toUpperCase(),
        nombre: editNombre.trim(),
        email: editEmail.trim() || null,
      };
      if (editPassword.trim()) {
        data.password = editPassword.trim();
      }

      const res = await adminApi.updateProfesor(editingProfesor.id, data);
      if (res.success) {
        setSuccessMessage('Datos del docente actualizados correctamente.');
        setIsEditModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Error al actualizar al docente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfesor = async (p: ProfesorItem) => {
    if (confirm(`¿Estás seguro de eliminar al profesor "${p.nombre}" (${p.matricula})?\nEsta acción eliminará también sus grupos asociados.`)) {
      try {
        const res = await adminApi.deleteProfesor(p.id);
        if (res.success) {
          setSuccessMessage(`Profesor ${p.nombre} eliminado.`);
          loadData();
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error al eliminar al docente.');
      }
    }
  };

  const filtered = profesores.filter(
    (p) =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <Head>
        <title>Panel Administrador • CheckU</title>
      </Head>

      <div className="space-y-6">
        {/* Banner de bienvenida y acción rápida */}
        <div className="bg-gradient-to-r from-[#172B4D] via-[#1E3A5F] to-[#0D1828] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#63B89F]/20 text-[#A8D8C8] px-3 py-1 rounded-full text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#63B89F]" />
              <span>Rol Exclusivo: Administrador General</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Gestión de Profesores
            </h1>
            <p className="text-sm text-gray-300 mt-1 max-w-2xl leading-relaxed">
              Como administrador, tu función es dar de alta a los profesores de la institución para que ellos puedan crear sus grupos y gestionar sus alumnos.
            </p>
          </div>

          <button
            onClick={() => {
              setErrorMessage('');
              setIsCreateModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-[#63B89F] hover:bg-[#52a78e] text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex-shrink-0"
          >
            <UserPlus className="w-5 h-5" />
            <span>+ Dar de Alta a Profesor</span>
          </button>
        </div>

        {/* Notificaciones */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage('')} className="text-xs text-emerald-600 font-bold hover:underline">
              Cerrar
            </button>
          </div>
        )}

        {/* Tarjetas de Métricas del Sistema */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#172B4D] text-[#63B89F] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6F7F8A] uppercase tracking-wider">Profesores</p>
              <h3 className="text-2xl font-black text-[#172B4D]">{stats?.total_profesores ?? profesores.length}</h3>
              <p className="text-[11px] text-gray-400">Plantilla activa</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6F7F8A] uppercase tracking-wider">Salones / Grupos</p>
              <h3 className="text-2xl font-black text-[#172B4D]">{stats?.total_grupos ?? 0}</h3>
              <p className="text-[11px] text-gray-400">Creados por docentes</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6F7F8A] uppercase tracking-wider">Alumnos</p>
              <h3 className="text-2xl font-black text-[#172B4D]">{stats?.total_alumnos ?? 0}</h3>
              <p className="text-[11px] text-gray-400">Inscritos en grupos</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6F7F8A] uppercase tracking-wider">Asistencias</p>
              <h3 className="text-2xl font-black text-[#172B4D]">{stats?.total_asistencias ?? 0}</h3>
              <p className="text-[11px] text-gray-400">Registradas con QR/PIN</p>
            </div>
          </div>
        </div>

        {/* Tabla de Profesores y Buscador */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#172B4D]">Plantilla de Profesores Registrados</h2>
              <p className="text-xs text-[#6F7F8A]">
                {filtered.length} docente{filtered.length === 1 ? '' : 's'} encontrado{filtered.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-[#172B4D] focus:ring-2 focus:ring-[#63B89F] focus:border-transparent outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-[#6F7F8A]">
              <div className="w-6 h-6 border-2 border-[#63B89F] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Cargando catálogo de profesores...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[#172B4D]">No se encontraron profesores</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                {searchTerm
                  ? 'No hay docentes que coincidan con la búsqueda actual.'
                  : 'Aún no has registrado profesores. Haz clic en "Dar de Alta a Profesor" para agregar el primero.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 bg-[#63B89F] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#52a78e] transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Dar de Alta a Profesor</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#6F7F8A] font-bold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3.5 px-4">Matrícula / Nómina</th>
                    <th className="py-3.5 px-4">Nombre Completo</th>
                    <th className="py-3.5 px-4">Correo Institucional</th>
                    <th className="py-3.5 px-4">Salones Asignados</th>
                    <th className="py-3.5 px-4">Alumnos Totales</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-[#172B4D] bg-gray-100 px-2 py-1 rounded-md text-[11px]">
                          {p.matricula}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#172B4D]">
                        {p.nombre}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">
                        {p.email ? (
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {p.email}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Sin correo</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold text-[11px]">
                          <BookOpen className="w-3.5 h-3.5" />
                          {p.total_grupos} grupo{p.total_grupos === 1 ? '' : 's'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold text-[11px]">
                          <Users className="w-3.5 h-3.5" />
                          {p.total_alumnos} alumno{p.total_alumnos === 1 ? '' : 's'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            title="Editar información del docente"
                            className="p-1.5 text-gray-500 hover:text-[#172B4D] hover:bg-gray-100 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProfesor(p)}
                            title="Eliminar docente"
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Dar de Alta a Profesor */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#172B4D] text-[#63B89F] flex items-center justify-center font-bold text-sm">
                    +
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#172B4D]">Dar de Alta a Nuevo Profesor</h3>
                    <p className="text-xs text-gray-500">Registra las credenciales oficiales del docente</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-sm p-1"
                >
                  ✕
                </button>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleCreateProfesor} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-1">
                    Matrícula o Nómina del Profesor *
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ej. DOC-202402"
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-[#172B4D] focus:ring-2 focus:ring-[#63B89F] outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-1">
                    Nombre Completo del Profesor *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Dra. Laura Elena Garza Morales"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-[#172B4D] focus:ring-2 focus:ring-[#63B89F] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-1">
                    Correo Institucional (Opcional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="Ej. laura.garza@checku.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-[#172B4D] focus:ring-2 focus:ring-[#63B89F] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-1">
                    Contraseña Inicial *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ej. Password123!"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-[#172B4D] focus:ring-2 focus:ring-[#63B89F] outline-none font-mono"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    El docente utilizará esta contraseña y su matrícula para ingresar a la plataforma web y la app móvil.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-[#63B89F] hover:bg-[#52a78e] text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-70 flex items-center gap-1.5"
                  >
                    {saving ? 'Guardando...' : 'Dar de Alta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Editar Profesor */}
        {isEditModalOpen && editingProfesor && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-[#172B4D]">Editar Docente</h3>
                  <p className="text-xs font-mono text-gray-500">{editingProfesor.matricula}</p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-sm p-1"
                >
                  ✕
                </button>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfesor} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-1">
                    Matrícula / Nómina Docente *
                  </label>
                  <input
                    type="text"
                    value={editMatricula}
                    onChange={(e) => setEditMatricula(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-[#172B4D] font-mono focus:ring-2 focus:ring-[#63B89F] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-[#172B4D] focus:ring-2 focus:ring-[#63B89F] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-1">
                    Correo Institucional
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-[#172B4D] focus:ring-2 focus:ring-[#63B89F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-1">
                    Nueva Contraseña (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Dejar en blanco para conservar la actual"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-[#172B4D] focus:ring-2 focus:ring-[#63B89F] outline-none font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-[#63B89F] hover:bg-[#52a78e] text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-70"
                  >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
