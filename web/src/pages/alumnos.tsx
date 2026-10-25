import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { profesorApi } from '@/services/api';
import {
  Users,
  UserPlus,
  Search,
  GraduationCap,
  Mail,
  Hash,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  AlertTriangle
} from 'lucide-react';

interface AlumnoItem {
  id: number;
  matricula: string;
  nombre: string;
  carrera?: string;
  email?: string;
  created_at?: string;
}

export default function AlumnosIndex() {
  const [alumnos, setAlumnos] = useState<AlumnoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal Crear Alumno
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [matricula, setMatricula] = useState('');
  const [nombre, setNombre] = useState('');
  const [carrera, setCarrera] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal Editar Alumno
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAlumno, setEditingAlumno] = useState<AlumnoItem | null>(null);
  const [editMatricula, setEditMatricula] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editCarrera, setEditCarrera] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Modal Eliminar Alumno
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [alumnoToDelete, setAlumnoToDelete] = useState<AlumnoItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAlumnos = async () => {
    try {
      setLoading(true);
      const res = await profesorApi.getAlumnos();
      if (res.success) setAlumnos(res.alumnos || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlumnos();
  }, []);

  const handleCreateAlumno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matricula.trim() || !nombre.trim()) {
      setErrorMsg('Matrícula y nombre son requeridos.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');
      const res = await profesorApi.createAlumno({
        matricula: matricula.trim().toUpperCase(),
        nombre: nombre.trim(),
        carrera: carrera.trim() || 'Ingeniería',
        email: email.trim() || `${matricula.trim().toLowerCase()}@checku.edu`,
      });
      if (res.success) {
        setSuccessMsg(`Alumno "${nombre.trim()}" registrado exitosamente.`);
        setIsCreateModalOpen(false);
        setMatricula('');
        setNombre('');
        setCarrera('');
        setEmail('');
        loadAlumnos();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error al registrar alumno.');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (alumno: AlumnoItem) => {
    setEditingAlumno(alumno);
    setEditMatricula(alumno.matricula);
    setEditNombre(alumno.nombre);
    setEditCarrera(alumno.carrera || '');
    setEditEmail(alumno.email || '');
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleUpdateAlumno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlumno) return;
    if (!editMatricula.trim() || !editNombre.trim()) {
      setErrorMsg('Matrícula y nombre completo son obligatorios.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');
      const res = await profesorApi.updateAlumno(editingAlumno.id, {
        matricula: editMatricula.trim().toUpperCase(),
        nombre: editNombre.trim(),
        carrera: editCarrera.trim(),
        email: editEmail.trim(),
      });
      if (res.success) {
        setSuccessMsg(`Alumno "${editNombre.trim()}" actualizado correctamente.`);
        setIsEditModalOpen(false);
        loadAlumnos();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error al actualizar alumno.');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (alumno: AlumnoItem) => {
    setAlumnoToDelete(alumno);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteAlumno = async () => {
    if (!alumnoToDelete) return;
    try {
      setDeleting(true);
      const res = await profesorApi.deleteAlumno(alumnoToDelete.id);
      if (res.success) {
        setSuccessMsg(`Alumno "${alumnoToDelete.nombre}" eliminado del sistema.`);
        setIsDeleteModalOpen(false);
        setAlumnoToDelete(null);
        loadAlumnos();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error al eliminar alumno.');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = alumnos.filter(
    (a) =>
      a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.carrera && a.carrera.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.email && a.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <Head>
        <title>Catálogo de Alumnos • CheckU</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#172B4D]">Directorio Institucional de Alumnos</h1>
              <span className="bg-[#63B89F]/20 text-[#172B4D] text-xs font-bold px-2.5 py-0.5 rounded-full">
                {alumnos.length} Registrados
              </span>
            </div>
            <p className="text-xs text-[#6F7F8A] mt-0.5">
              Gestión integral (CRUD) de estudiantes: altas, consultas, modificaciones y bajas
            </p>
          </div>
          <button
            onClick={() => {
              setErrorMsg('');
              setIsCreateModalOpen(true);
            }}
            className="checku-btn-primary self-start sm:self-auto text-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Nuevo Alumno</span>
          </button>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-red-700 hover:text-red-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search filter */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#6F7F8A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por matrícula (ej. A01700101), nombre, carrera o correo institucional..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#63B89F] outline-none"
          />
        </div>

        {/* Students Table */}
        <div className="checku-card p-6">
          {loading ? (
            <div className="text-center py-12 text-sm text-[#6F7F8A]">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <span>Cargando catálogo de alumnos...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-[#6F7F8A]">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-[#172B4D]">No se encontraron alumnos</p>
              <p className="text-xs text-gray-400 mt-1">Prueba con otro término de búsqueda o registra un nuevo alumno.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-[#6F7F8A] uppercase font-bold tracking-wider">
                    <th className="pb-3 pl-2">Matrícula</th>
                    <th className="pb-3">Nombre Completo</th>
                    <th className="pb-3">Carrera</th>
                    <th className="pb-3">Correo Institucional</th>
                    <th className="pb-3 text-center">Estatus</th>
                    <th className="pb-3 text-right pr-2">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((al) => (
                    <tr key={al.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 pl-2 font-mono font-bold text-[#172B4D]">
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-[#63B89F]" />
                          <span>{al.matricula}</span>
                        </div>
                      </td>
                      <td className="py-3 font-semibold text-[#172B4D]">{al.nombre}</td>
                      <td className="py-3 text-[#6F7F8A]">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-[#63B89F]" />
                          <span>{al.carrera || 'Ingeniería en Software'}</span>
                        </div>
                      </td>
                      <td className="py-3 text-[#6F7F8A]">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span>{al.email || `${al.matricula.toLowerCase()}@checku.edu`}</span>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span className="inline-block bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                          Activo
                        </span>
                      </td>
                      <td className="py-3 text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(al)}
                            title="Editar Alumno"
                            className="p-1.5 text-gray-500 hover:text-[#172B4D] hover:bg-gray-100 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(al)}
                            title="Eliminar Alumno"
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
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

        {/* MODAL 1: Registrar Nuevo Alumno */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-[#172B4D]">Registrar Nuevo Alumno</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-[#6F7F8A] mb-4">
                El alumno quedará registrado en la base de datos de CheckU y podrá ser asignado a clases.
              </p>

              <form onSubmit={handleCreateAlumno} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                    Matrícula Institucional *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. A01700201"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-[#63B89F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Laura Patricia Morales"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#63B89F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                    Carrera
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Ingeniería en Software"
                    value={carrera}
                    onChange={(e) => setCarrera(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#63B89F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                    Correo Electrónico (Opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="Ej. laura.morales@checku.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#63B89F]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#6F7F8A] hover:bg-gray-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="checku-btn-primary text-xs"
                  >
                    {saving ? 'Guardando...' : 'Registrar Alumno'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Editar Alumno */}
        {isEditModalOpen && editingAlumno && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-[#172B4D]">Editar Datos del Alumno</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-[#6F7F8A] mb-4">
                Actualiza los datos del estudiante en la base de datos de CheckU.
              </p>

              <form onSubmit={handleUpdateAlumno} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                    Matrícula Institucional *
                  </label>
                  <input
                    type="text"
                    required
                    value={editMatricula}
                    onChange={(e) => setEditMatricula(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-[#63B89F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#63B89F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                    Carrera
                  </label>
                  <input
                    type="text"
                    value={editCarrera}
                    onChange={(e) => setEditCarrera(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#63B89F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                    Correo Institucional
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#63B89F]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#6F7F8A] hover:bg-gray-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="checku-btn-primary text-xs"
                  >
                    {saving ? 'Guardando cambios...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: Confirmar Eliminación de Alumno */}
        {isDeleteModalOpen && alumnoToDelete && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#172B4D] mb-1">¿Eliminar Alumno?</h3>
              <p className="text-xs text-[#6F7F8A] mb-4">
                ¿Estás seguro de eliminar a <strong>{alumnoToDelete.nombre}</strong> ({alumnoToDelete.matricula})? Esta acción desvinculará sus asistencias y registros.
              </p>

              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setAlumnoToDelete(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#6F7F8A] hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteAlumno}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow"
                >
                  {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
