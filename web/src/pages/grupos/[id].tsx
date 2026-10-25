import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { profesorApi, justificantesApi } from '@/services/api';
import exportReports from '@/utils/exportReports';
import {
  ArrowLeft,
  Users,
  UserPlus,
  QrCode,
  MapPin,
  Clock,
  Trash2,
  CheckCircle,
  AlertCircle,
  Search,
  BookOpen,
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  FileCheck2,
  UploadCloud,
  Eye,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Plus,
  CheckSquare,
  Square,
  X
} from 'lucide-react';

export default function GrupoDetalle() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [grupo, setGrupo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Enroll modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [enrollTab, setEnrollTab] = useState<'directorio' | 'manual'>('directorio');
  const [directorioAlumnos, setDirectorioAlumnos] = useState<any[]>([]);
  const [loadingDirectorio, setLoadingDirectorio] = useState(false);
  const [searchDirectorio, setSearchDirectorio] = useState('');
  const [selectedAlumnoIds, setSelectedAlumnoIds] = useState<number[]>([]);
  const [matricula, setMatricula] = useState('');
  const [nombre, setNombre] = useState('');
  const [carrera, setCarrera] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Justificante Modal State
  const [isJustificanteModalOpen, setIsJustificanteModalOpen] = useState(false);
  const [justAlumnoId, setJustAlumnoId] = useState<number | string>('');
  const [justFechaFalta, setJustFechaFalta] = useState<string>(new Date().toISOString().split('T')[0]);
  const [justMotivo, setJustMotivo] = useState<string>('Médico');
  const [justComentarios, setJustComentarios] = useState<string>('');
  const [justArchivo, setJustArchivo] = useState<File | null>(null);
  const [justSaving, setJustSaving] = useState(false);
  const [justError, setJustError] = useState('');

  // Preview receipt modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('pdf');
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const loadDetalle = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await profesorApi.getGrupoDetalle(id as string);
      if (res.success) {
        setGrupo(res.grupo);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetalle();
  }, [id]);

  const handleOpenEnrollModal = async () => {
    setIsModalOpen(true);
    setEnrollTab('directorio');
    setModalError('');
    setSearchDirectorio('');
    setSelectedAlumnoIds([]);
    try {
      setLoadingDirectorio(true);
      const res = await profesorApi.getAlumnos();
      if (res.success && res.alumnos) {
        setDirectorioAlumnos(res.alumnos);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDirectorio(false);
    }
  };

  const currentGrupoAlumnoIds = new Set((grupo?.alumnos || []).map((a: any) => a.id));

  const alumnosDisponiblesDirectorio = (directorioAlumnos || []).filter(
    (al: any) => !currentGrupoAlumnoIds.has(al.id)
  );

  const alumnosFiltradosDirectorio = alumnosDisponiblesDirectorio.filter((al: any) => {
    const q = searchDirectorio.trim().toLowerCase();
    if (!q) return true;
    return (
      (al.nombre && al.nombre.toLowerCase().includes(q)) ||
      (al.matricula && al.matricula.toLowerCase().includes(q)) ||
      (al.carrera && al.carrera.toLowerCase().includes(q))
    );
  });

  const toggleSelectAlumno = (alumnoId: number) => {
    setSelectedAlumnoIds((prev) =>
      prev.includes(alumnoId) ? prev.filter((item) => item !== alumnoId) : [...prev, alumnoId]
    );
  };

  const handleToggleSelectAll = () => {
    const visibleIds = alumnosFiltradosDirectorio.map((a: any) => a.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedAlumnoIds.includes(id));
    if (allSelected) {
      setSelectedAlumnoIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      const combined = new Set([...selectedAlumnoIds, ...visibleIds]);
      setSelectedAlumnoIds(Array.from(combined));
    }
  };

  const handleBatchEnroll = async () => {
    if (selectedAlumnoIds.length === 0) {
      setModalError('Selecciona al menos un alumno para inscribir.');
      return;
    }

    try {
      setSaving(true);
      setModalError('');
      const res = await profesorApi.batchAddAlumnosToGrupo(id as string, {
        alumno_ids: selectedAlumnoIds,
      });
      if (res.success) {
        setIsModalOpen(false);
        setSelectedAlumnoIds([]);
        loadDetalle();
      }
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Error al inscribir alumnos seleccionados.');
    } finally {
      setSaving(false);
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matricula) {
      setModalError('La matrícula es obligatoria.');
      return;
    }

    try {
      setSaving(true);
      setModalError('');
      const res = await profesorApi.addAlumnoToGrupo(id as string, {
        matricula: matricula.trim().toUpperCase(),
        nombre: nombre.trim(),
        carrera: carrera.trim(),
      });
      if (res.success) {
        setIsModalOpen(false);
        setMatricula('');
        setNombre('');
        setCarrera('');
        loadDetalle();
      }
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Error al inscribir alumno.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStudent = async (alumnoId: number, alumnoNombre: string) => {
    if (confirm(`¿Desvincular a "${alumnoNombre}" de este salón?`)) {
      try {
        await profesorApi.removeAlumnoFromGrupo(id as string, alumnoId);
        loadDetalle();
      } catch (err) {
        alert('Error al desvincular al alumno');
      }
    }
  };

  const handleOpenJustificanteModal = (alumnoId?: number) => {
    if (alumnoId) {
      setJustAlumnoId(alumnoId);
    } else if (grupo?.alumnos?.length > 0) {
      setJustAlumnoId(grupo.alumnos[0].id);
    }
    setJustFechaFalta(new Date().toISOString().split('T')[0]);
    setJustMotivo('Cita médica / Salud');
    setJustComentarios('');
    setJustArchivo(null);
    setJustError('');
    setIsJustificanteModalOpen(true);
  };

  const handleSubmitJustificante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justAlumnoId) {
      setJustError('Por favor selecciona el alumno.');
      return;
    }
    if (!justArchivo) {
      setJustError('Debes adjuntar el comprobante en formato PDF o imagen.');
      return;
    }

    try {
      setJustSaving(true);
      setJustError('');
      const formData = new FormData();
      formData.append('alumno_id', String(justAlumnoId));
      formData.append('grupo_id', String(id));
      formData.append('fecha_falta', justFechaFalta);
      formData.append('motivo', justMotivo);
      formData.append('comentarios', justComentarios);
      formData.append('archivo', justArchivo);

      const res = await justificantesApi.subirJustificante(formData);
      if (res.success) {
        setIsJustificanteModalOpen(false);
        loadDetalle();
      }
    } catch (err: any) {
      setJustError(err.response?.data?.message || 'Error al registrar el justificante.');
    } finally {
      setJustSaving(false);
    }
  };

  const handleViewReceipt = (archivoUrl: string, nombreOriginal: string, tipo: string) => {
    const fullUrl = archivoUrl.startsWith('http') ? archivoUrl : `http://localhost:5000${archivoUrl}`;
    setPreviewUrl(fullUrl);
    setPreviewType(tipo || 'pdf');
    setPreviewTitle(nombreOriginal || 'Comprobante de Falta');
  };

  const alumnosFiltrados = (grupo?.alumnos || []).filter(
    (al: any) =>
      al.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      al.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (al.carrera && al.carrera.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <Head>
        <title>{grupo ? `${grupo.nombre_materia} • CheckU` : 'Detalle de Salón'}</title>
      </Head>

      <div className="space-y-6">
        {/* Back navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/grupos"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#6F7F8A] hover:text-[#172B4D] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Salones</span>
          </Link>

          {grupo && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const alumnosData = (grupo.alumnos || []).map((al: any) => ({
                    id: al.id,
                    matricula: al.matricula,
                    nombre: al.nombre,
                    carrera: al.carrera,
                    total_asistencias: al.asistencias_totales ?? al.asistencias_count ?? 0,
                    total_sesiones: grupo.total_sesiones || 0,
                    porcentaje_asistencia: al.asistencias_porcentaje || 0,
                  }));
                  exportReports.exportClassToExcel(grupo, alumnosData, user?.nombre || 'Docente CheckU');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition shadow-sm"
                title="Descargar lista y asistencias en Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Exportar Excel</span>
              </button>

              <button
                onClick={() => {
                  const alumnosData = (grupo.alumnos || []).map((al: any) => ({
                    id: al.id,
                    matricula: al.matricula,
                    nombre: al.nombre,
                    carrera: al.carrera,
                    total_asistencias: al.asistencias_totales ?? al.asistencias_count ?? 0,
                    total_sesiones: grupo.total_sesiones || 0,
                    porcentaje_asistencia: al.asistencias_porcentaje || 0,
                  }));
                  exportReports.exportClassToPDF(grupo, alumnosData, user?.nombre || 'Docente CheckU');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-800 bg-red-50 hover:bg-red-100 border border-red-300 transition shadow-sm"
                title="Descargar reporte oficial en PDF"
              >
                <FileText className="w-4 h-4 text-red-600" />
                <span>Exportar PDF</span>
              </button>

              <button
                onClick={() => {
                  window.open(`http://localhost:5000/api/profesor/grupos/${grupo.id}/exportar-csv`, '_blank');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#172B4D] bg-gray-50 hover:bg-gray-100 border border-gray-300 transition shadow-sm"
                title="Descargar archivo CSV oficial compatible con Excel"
              >
                <Download className="w-4 h-4 text-[#172B4D]" />
                <span>CSV</span>
              </button>

              <button
                onClick={() => handleOpenJustificanteModal()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#172B4D] bg-amber-50 hover:bg-amber-100 border border-amber-300 transition shadow-sm"
              >
                <FileCheck2 className="w-4 h-4 text-amber-600" />
                <span>+ Subir Justificante</span>
              </button>

              <Link
                href={`/proyector/${grupo.id}`}
                className="checku-btn-primary self-start sm:self-auto text-xs"
              >
                <QrCode className="w-4 h-4" />
                <span>Proyectar Pase de Lista QR</span>
              </Link>
            </div>
          )}
        </div>

        {/* Group Header Card */}
        {loading || !grupo ? (
          <div className="checku-card p-8 animate-pulse bg-gray-100 rounded-xl h-36"></div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold bg-[#172B4D] text-[#A8D8C8] px-3 py-1 rounded-lg">
                    {grupo.codigo_grupo}
                  </span>
                  {grupo.sesion_activa && (
                    <span className="flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full animate-pulse border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Sesión QR Activa
                    </span>
                  )}
                  <span className="text-xs bg-gray-100 text-gray-700 font-semibold px-2.5 py-1 rounded-lg">
                    Cuatrimestre ({grupo.duracion_meses || '4.0'} meses)
                  </span>
                </div>
                <h1 className="text-2xl font-black text-[#172B4D] mt-2">
                  {grupo.nombre_materia}
                </h1>

                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-[#6F7F8A]">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#63B89F]" />
                    <span>Aula: <strong className="text-[#172B4D]">{grupo.aula}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#63B89F]" />
                    <span>Horario: <strong className="text-[#172B4D]">{grupo.horario}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#63B89F]" />
                    <span>
                      Periodo: <strong className="text-[#172B4D]">{grupo.fecha_inicio || 'Inicio'} al {grupo.fecha_fin || 'Fin'}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#63B89F]" />
                    <span>Alumnos: <strong className="text-[#172B4D]">{grupo.alumnos?.length || 0}</strong></span>
                  </div>
                </div>
              </div>

              {/* Cuatrimestre Progress KPI */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 min-w-[200px] text-right">
                <span className="text-[11px] font-bold text-[#6F7F8A] uppercase block tracking-wider">
                  Avance Cuatrimestral
                </span>
                <span className="text-2xl font-black text-[#172B4D] block mt-0.5">
                  {grupo.total_sesiones} / {grupo.total_sesiones_planeadas || 32}
                </span>
                <span className="text-xs text-[#63B89F] font-bold">
                  {grupo.sesiones_restantes || 0} clases restantes
                </span>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm text-center">
                <span className="text-[10px] uppercase font-bold text-[#6F7F8A] block">Sesiones Planeadas</span>
                <span className="text-xl font-black text-[#172B4D]">{grupo.total_sesiones_planeadas || 32}</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm text-center">
                <span className="text-[10px] uppercase font-bold text-[#6F7F8A] block">Sesiones Impartidas</span>
                <span className="text-xl font-black text-[#63B89F]">{grupo.total_sesiones}</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm text-center">
                <span className="text-[10px] uppercase font-bold text-[#6F7F8A] block">Límite Faltas (20%)</span>
                <span className="text-xl font-black text-amber-600">{grupo.max_faltas_permitidas || 6}</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm text-center">
                <span className="text-[10px] uppercase font-bold text-[#6F7F8A] block">Faltas Justificadas</span>
                <span className="text-xl font-black text-emerald-700">{grupo.justificantes?.length || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Section: Justificantes Registrados */}
        {grupo && (grupo.justificantes?.length > 0 || isJustificanteModalOpen) && (
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-amber-600" />
                <div>
                  <h2 className="text-base font-bold text-[#172B4D]">Comprobantes de Falta y Justificantes</h2>
                  <p className="text-[11px] text-[#6F7F8A]">
                    Faltas recuperadas mediante comprobante médico o institucional (PDF / Imagen)
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleOpenJustificanteModal()}
                className="checku-btn-primary text-xs py-1.5 px-3"
              >
                + Subir Justificante
              </button>
            </div>

            {grupo.justificantes?.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">
                No hay justificantes registrados en este salón todavía.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-[#6F7F8A] uppercase font-bold tracking-wider">
                      <th className="pb-3 pl-2">Fecha Falta</th>
                      <th className="pb-3">Alumno</th>
                      <th className="pb-3">Motivo</th>
                      <th className="pb-3">Comprobante</th>
                      <th className="pb-3 text-center">Estatus</th>
                      <th className="pb-3 text-right pr-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {grupo.justificantes.map((j: any) => (
                      <tr key={j.id} className="hover:bg-gray-50 transition">
                        <td className="py-3 pl-2 font-mono font-bold text-[#172B4D]">{j.fecha_falta}</td>
                        <td className="py-3">
                          <span className="font-semibold text-[#172B4D] block">{j.alumno_nombre}</span>
                          <span className="font-mono text-[11px] text-[#6F7F8A]">{j.alumno_matricula}</span>
                        </td>
                        <td className="py-3 text-[#172B4D] max-w-xs truncate">{j.motivo}</td>
                        <td className="py-3">
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(j.archivo_url, j.nombre_original, j.tipo_archivo)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-semibold text-[#172B4D] transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#63B89F]" />
                            <span className="max-w-[120px] truncate">{j.nombre_original || 'Ver archivo'}</span>
                          </button>
                        </td>
                        <td className="py-3 text-center">
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>RECUPERADA</span>
                          </span>
                        </td>
                        <td className="py-3 text-right pr-2">
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(j.archivo_url, j.nombre_original, j.tipo_archivo)}
                            className="text-xs text-blue-600 hover:underline font-bold"
                          >
                            Abrir Documento
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Students list section */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-[#172B4D]">Listado de Alumnos y Asistencia Cuatrimestral</h2>
              <p className="text-xs text-[#6F7F8A]">
                Presenciales, faltas justificadas recuperadas y cálculo de riesgo según el cuatrimestre
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#6F7F8A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por nombre o matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#63B89F]"
                />
              </div>

              <button
                onClick={handleOpenEnrollModal}
                className="checku-btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Inscribir Alumnos</span>
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8 text-xs text-[#6F7F8A]">Cargando lista de alumnos...</div>
          ) : alumnosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-[#6F7F8A]">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">No hay alumnos inscritos en este salón</p>
              <p className="text-xs mt-1">Haz clic en &quot;Inscribir Alumno&quot; para agregarlos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-[#6F7F8A] uppercase font-bold tracking-wider">
                    <th className="pb-3 pl-2">Matrícula</th>
                    <th className="pb-3">Nombre Completo</th>
                    <th className="pb-3 text-center">Presenciales</th>
                    <th className="pb-3 text-center">Justificadas</th>
                    <th className="pb-3 text-center">Faltas Acum.</th>
                    <th className="pb-3 text-center">% Asistencia</th>
                    <th className="pb-3 text-center">Estatus</th>
                    <th className="pb-3 text-right pr-2">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {alumnosFiltrados.map((al: any) => {
                    const isRisk = al.en_riesgo;
                    return (
                      <tr key={al.id} className="hover:bg-gray-50 transition">
                        <td className="py-3.5 pl-2 font-mono font-bold text-[#172B4D]">
                          {al.matricula}
                        </td>
                        <td className="py-3.5 font-medium text-[#172B4D]">
                          <div>{al.nombre}</div>
                          <span className="text-[11px] text-[#6F7F8A]">{al.carrera || 'Ingeniería'}</span>
                        </td>
                        <td className="py-3.5 text-center font-bold text-[#172B4D]">
                          {al.asistencias_count || 0}
                        </td>
                        <td className="py-3.5 text-center">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {al.faltas_justificadas || 0}
                          </span>
                        </td>
                        <td className="py-3.5 text-center font-semibold text-gray-700">
                          {al.faltas_acumuladas ?? 0} / {al.max_faltas_permitidas || 6}
                        </td>
                        <td className="py-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                              al.asistencias_porcentaje >= 80
                                ? 'bg-emerald-100 text-emerald-800'
                                : al.asistencias_porcentaje >= 60
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {al.asistencias_porcentaje}%
                          </span>
                        </td>
                        <td className="py-3.5 text-center">
                          {isRisk ? (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              <span>EN RIESGO</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>REGULAR</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 text-right pr-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenJustificanteModal(al.id)}
                              className="text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition"
                              title="Justificar falta con comprobante"
                            >
                              Justificar Falta
                            </button>
                            <button
                              onClick={() => handleRemoveStudent(al.id, al.nombre)}
                              className="text-gray-400 hover:text-red-600 p-1 rounded-lg transition hover:bg-red-50"
                              title="Desvincular del grupo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Subir Justificante de Falta (PDF o Imagen) */}
        {isJustificanteModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <FileCheck2 className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#172B4D]">Justificar Falta de Alumno</h3>
                    <p className="text-[11px] text-[#6F7F8A]">Sube el comprobante (PDF o imagen) para recuperar la falta</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsJustificanteModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg"
                >
                  ✕
                </button>
              </div>

              {justError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{justError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitJustificante} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                    Seleccionar Alumno
                  </label>
                  <select
                    value={justAlumnoId}
                    onChange={(e) => setJustAlumnoId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#63B89F] bg-white font-medium"
                    required
                  >
                    <option value="">-- Selecciona un alumno --</option>
                    {(grupo?.alumnos || []).map((al: any) => (
                      <option key={al.id} value={al.id}>
                        {al.nombre} ({al.matricula})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                      Fecha de la Falta
                    </label>
                    <input
                      type="date"
                      required
                      value={justFechaFalta}
                      onChange={(e) => setJustFechaFalta(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#63B89F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                      Motivo de la Inasistencia
                    </label>
                    <select
                      value={justMotivo}
                      onChange={(e) => setJustMotivo(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#63B89F] bg-white"
                    >
                      <option value="Cita médica / Salud">Cita médica / Salud</option>
                      <option value="Trámite institucional">Trámite institucional</option>
                      <option value="Causa de fuerza mayor">Causa de fuerza mayor</option>
                      <option value="Motivo personal justificado">Motivo personal justificado</option>
                    </select>
                  </div>
                </div>

                {/* File Upload Box */}
                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                    Comprobante (PDF o Imagen JPG, PNG)
                  </label>
                  <div className="mt-1 border-2 border-dashed border-gray-300 hover:border-[#63B89F] rounded-2xl p-4 text-center transition bg-gray-50/50">
                    <input
                      type="file"
                      id="justArchivoInput"
                      accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setJustArchivo(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="justArchivoInput" className="cursor-pointer flex flex-col items-center">
                      <UploadCloud className="w-8 h-8 text-[#63B89F] mb-1" />
                      <span className="text-xs font-bold text-[#172B4D]">
                        {justArchivo ? justArchivo.name : 'Haz clic para seleccionar comprobante'}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-0.5">
                        Acepta recetas médicas o justificantes en PDF o imagen
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                    Notas adicionales (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={justComentarios}
                    onChange={(e) => setJustComentarios(e.target.value)}
                    placeholder="Ej. Receta expedida por el IMSS debidamente sellada."
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#63B89F]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsJustificanteModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-[#6F7F8A] hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={justSaving || !justArchivo}
                    className="checku-btn-primary text-xs disabled:opacity-50"
                  >
                    {justSaving ? 'Guardando y recuperando...' : 'Recuperar Falta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Previsualización de Comprobante (PDF / Imagen) */}
        {previewUrl && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
                <h3 className="text-sm font-bold text-[#172B4D] truncate">{previewTitle}</h3>
                <div className="flex items-center gap-2">
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs flex items-center gap-1 font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Pestaña nueva</span>
                  </a>
                  <button
                    onClick={() => setPreviewUrl(null)}
                    className="text-gray-400 hover:text-gray-600 text-lg px-2"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-gray-50 rounded-2xl">
                {previewType === 'image' || previewUrl.match(/\.(png|jpe?g|webp)$/i) ? (
                  <img
                    src={previewUrl}
                    alt={previewTitle}
                    className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
                  />
                ) : (
                  <iframe
                    src={previewUrl}
                    title={previewTitle}
                    className="w-full h-[70vh] rounded-lg border border-gray-200"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Inscribir Alumnos con Búsqueda, Filtros y Selección Múltiple */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative max-h-[92vh] flex flex-col border border-gray-100">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#63B89F]/10 rounded-2xl text-[#2F7363]">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#172B4D]">
                      Inscribir Alumnos a la Clase
                    </h3>
                    <p className="text-xs text-[#6F7F8A]">
                      {grupo?.nombre_materia} • Grupo <strong className="text-[#172B4D]">{grupo?.codigo_grupo}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEnrollTab('directorio');
                    setModalError('');
                  }}
                  className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
                    enrollTab === 'directorio'
                      ? 'border-[#63B89F] text-[#2F7363]'
                      : 'border-transparent text-[#6F7F8A] hover:text-[#172B4D]'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Directorio y Selección Múltiple</span>
                  {alumnosDisponiblesDirectorio.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#63B89F]/15 text-[#2F7363]">
                      {alumnosDisponiblesDirectorio.length} disponibles
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEnrollTab('manual');
                    setModalError('');
                  }}
                  className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
                    enrollTab === 'manual'
                      ? 'border-[#63B89F] text-[#2F7363]'
                      : 'border-transparent text-[#6F7F8A] hover:text-[#172B4D]'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Alta Manual Nueva</span>
                </button>
              </div>

              {modalError && (
                <div className="mt-3 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Tab 1: Directorio & Batch Selection */}
              {enrollTab === 'directorio' && (
                <div className="flex-1 overflow-hidden flex flex-col pt-4">
                  {/* Search and Filters Bar */}
                  <div className="relative mb-3">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar alumnos por nombre, matrícula o carrera..."
                      value={searchDirectorio}
                      onChange={(e) => setSearchDirectorio(e.target.value)}
                      className="w-full pl-10 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#63B89F] transition"
                    />
                    {searchDirectorio && (
                      <button
                        onClick={() => setSearchDirectorio('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                        title="Limpiar búsqueda"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Batch Selection Controls Header */}
                  <div className="flex items-center justify-between py-2 px-1 text-xs text-[#6F7F8A] border-b border-gray-100 mb-2">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      disabled={alumnosFiltradosDirectorio.length === 0}
                      className="inline-flex items-center gap-1.5 font-bold text-xs text-[#2F7363] hover:underline disabled:opacity-50"
                    >
                      {alumnosFiltradosDirectorio.length > 0 &&
                      alumnosFiltradosDirectorio.every((a: any) => selectedAlumnoIds.includes(a.id)) ? (
                        <>
                          <CheckSquare className="w-4 h-4 text-[#63B89F]" />
                          <span>Deseleccionar todos</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4 text-gray-400" />
                          <span>Seleccionar todos los visibles ({alumnosFiltradosDirectorio.length})</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      {selectedAlumnoIds.length > 0 && (
                        <span className="px-2.5 py-0.5 bg-[#63B89F]/15 text-[#2F7363] rounded-full text-[11px] font-bold">
                          {selectedAlumnoIds.length} seleccionado(s)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Student List Scrollable */}
                  <div className="flex-1 overflow-y-auto max-h-[320px] divide-y divide-gray-100 border border-gray-100 rounded-2xl bg-gray-50/50">
                    {loadingDirectorio ? (
                      <div className="py-12 text-center text-xs text-gray-500">
                        Cargando catálogo institucional de alumnos...
                      </div>
                    ) : alumnosDisponiblesDirectorio.length === 0 ? (
                      <div className="py-10 text-center text-gray-500 px-4">
                        <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-[#172B4D]">Todos los alumnos ya están en este salón</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Todos los alumnos registrados en CheckU forman parte de esta clase.
                        </p>
                      </div>
                    ) : alumnosFiltradosDirectorio.length === 0 ? (
                      <div className="py-10 text-center text-gray-500 px-4">
                        <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-[#172B4D]">
                          Sin resultados para &ldquo;{searchDirectorio}&rdquo;
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Prueba con otra matrícula o nombre, o regístralo en la pestaña &ldquo;Alta Manual Nueva&rdquo;.
                        </p>
                      </div>
                    ) : (
                      alumnosFiltradosDirectorio.map((al: any) => {
                        const isSelected = selectedAlumnoIds.includes(al.id);
                        return (
                          <div
                            key={al.id}
                            onClick={() => toggleSelectAlumno(al.id)}
                            className={`flex items-center justify-between p-3 cursor-pointer transition select-none ${
                              isSelected
                                ? 'bg-emerald-50/90 border-l-4 border-l-[#63B89F]'
                                : 'hover:bg-white bg-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="shrink-0">
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5 text-[#2F7363]" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-xs text-[#172B4D] block truncate">
                                  {al.nombre}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#6F7F8A]">
                                  <span className="font-mono font-bold text-[#2F7363] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {al.matricula}
                                  </span>
                                  <span className="truncate">{al.carrera || 'Ingeniería'}</span>
                                </div>
                              </div>
                            </div>

                            <span className="text-[11px] font-semibold shrink-0 ml-2">
                              {isSelected ? (
                                <span className="text-[#2F7363] font-bold bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                                  Seleccionado
                                </span>
                              ) : (
                                <span className="text-gray-400 hover:text-gray-600">
                                  + Seleccionar
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Direct Action Footer */}
                  <div className="flex items-center justify-between gap-3 pt-4 mt-2 border-t border-gray-100">
                    <span className="text-xs text-[#6F7F8A]">
                      {selectedAlumnoIds.length > 0 ? (
                        <strong className="text-[#172B4D]">
                          {selectedAlumnoIds.length} alumno(s) seleccionado(s)
                        </strong>
                      ) : (
                        'Selecciona uno o más alumnos para inscribir'
                      )}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 text-xs font-semibold text-[#6F7F8A] hover:bg-gray-100 rounded-xl"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleBatchEnroll}
                        disabled={saving || selectedAlumnoIds.length === 0}
                        className="checku-btn-primary text-xs disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>
                          {saving
                            ? 'Inscribiendo...'
                            : selectedAlumnoIds.length > 0
                            ? `Inscribir (${selectedAlumnoIds.length}) Alumnos`
                            : 'Inscribir Seleccionados'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Manual Registration */}
              {enrollTab === 'manual' && (
                <form onSubmit={handleEnrollStudent} className="space-y-4 pt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 leading-relaxed">
                    💡 <strong>Registro Manual:</strong> Útil para alumnos que ingresan por primera vez a CheckU. Si la matrícula ya existe, se vinculará de inmediato al salón sin duplicados.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                      Matrícula del Alumno
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. A01700106"
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#63B89F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                      Nombre Completo (Si es nuevo)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Roberto Gómez Bolaños"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#63B89F]"
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
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#63B89F]"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-[#6F7F8A] hover:bg-gray-100 rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="checku-btn-primary text-xs"
                    >
                      {saving ? 'Guardando...' : 'Inscribir Alumno'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
