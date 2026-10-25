import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { profesorApi } from '@/services/api';
import exportReports from '@/utils/exportReports';
import scheduleHelper from '@/utils/scheduleHelper';
import {
  BookOpen,
  Plus,
  Search,
  MapPin,
  Clock,
  Users,
  QrCode,
  Trash2,
  CalendarCheck,
  Check,
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  AlertTriangle,
  Sparkles,
  Info,
  FileCheck2,
  Edit2,
  X
} from 'lucide-react';

export default function GruposIndex() {
  const { user } = useAuth();
  const [grupos, setGrupos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New group form state
  const [materia, setMateria] = useState('');
  const [codigo, setCodigo] = useState('');
  const [aula, setAula] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cuatrimestre Dates (Default: today to 3.5 months ahead)
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultEnd = new Date(Date.now() + 110 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(todayStr);
  const [fechaFin, setFechaFin] = useState(defaultEnd);

  // Structured Schedule Builder
  const [selectedDays, setSelectedDays] = useState<string[]>(['Lunes', 'Miércoles']);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return; // Keep at least one day
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  // Real-time Cuatrimestre & Session Calculation (Reusable for create & edit)
  const getCuatrimestreStats = (
    fIni: string = fechaInicio,
    fFin: string = fechaFin,
    days: string[] = selectedDays
  ) => {
    if (!fIni || !fFin) return null;
    const start = new Date(fIni + 'T00:00:00');
    const end = new Date(fFin + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const isExceeded = diffDays > 125; // Exceeds 4 months
    const isNegative = diffDays <= 0;

    const dayMap: { [key: string]: number } = {
      'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Miercoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6, 'Sabado': 6
    };
    const targetDays = days.map(d => dayMap[d]).filter(d => d !== undefined);

    let sessionCount = 0;
    if (!isNegative && !isExceeded) {
      const cur = new Date(start);
      while (cur <= end) {
        if (targetDays.includes(cur.getDay())) {
          sessionCount++;
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    const maxFaltas = Math.floor(sessionCount * 0.20);

    return {
      diffDays,
      months: (diffDays / 30.5).toFixed(1),
      isExceeded,
      isNegative,
      sessionCount,
      maxFaltas
    };
  };

  const cuatriStats = getCuatrimestreStats();

  // Edit group modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<any>(null);
  const [editMateria, setEditMateria] = useState('');
  const [editCodigo, setEditCodigo] = useState('');
  const [editAula, setEditAula] = useState('');
  const [editFechaInicio, setEditFechaInicio] = useState(todayStr);
  const [editFechaFin, setEditFechaFin] = useState(defaultEnd);
  const [editSelectedDays, setEditSelectedDays] = useState<string[]>(['Lunes', 'Miércoles']);
  const [editStartTime, setEditStartTime] = useState('08:00');
  const [editEndTime, setEditEndTime] = useState('10:00');
  const [editSaving, setEditSaving] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState('');

  const toggleEditDay = (day: string) => {
    if (editSelectedDays.includes(day)) {
      if (editSelectedDays.length === 1) return;
      setEditSelectedDays(editSelectedDays.filter((d) => d !== day));
    } else {
      setEditSelectedDays([...editSelectedDays, day]);
    }
  };

  const openEditModal = (grupo: any) => {
    setEditingGrupo(grupo);
    setEditMateria(grupo.nombre_materia || '');
    setEditCodigo(grupo.codigo_grupo || '');
    setEditAula(grupo.aula || '');
    setEditFechaInicio(grupo.fecha_inicio ? grupo.fecha_inicio.split('T')[0] : todayStr);
    setEditFechaFin(grupo.fecha_fin ? grupo.fecha_fin.split('T')[0] : defaultEnd);

    let days: string[] = ['Lunes', 'Miércoles'];
    if (grupo.dias_semana) {
      days = grupo.dias_semana.split(',').map((d: string) => d.trim()).filter(Boolean);
    }
    setEditSelectedDays(days.length > 0 ? days : ['Lunes', 'Miércoles']);
    setEditStartTime(grupo.hora_inicio || '08:00');
    setEditEndTime(grupo.hora_fin || '10:00');
    setEditErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrupo) return;

    if (!editMateria.trim() || !editCodigo.trim()) {
      setEditErrorMsg('Nombre de materia y código son requeridos.');
      return;
    }

    const stats = getCuatrimestreStats(editFechaInicio, editFechaFin, editSelectedDays);
    if (stats?.isNegative) {
      setEditErrorMsg('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }
    if (stats?.isExceeded) {
      setEditErrorMsg('La clase no puede durar más de 4 meses (máximo 125 días).');
      return;
    }

    try {
      setEditSaving(true);
      setEditErrorMsg('');

      const horarioString = `${editSelectedDays.join(', ')} | ${editStartTime} - ${editEndTime}`;

      const res = await profesorApi.updateGrupo(editingGrupo.id, {
        nombre_materia: editMateria.trim(),
        codigo_grupo: editCodigo.trim(),
        aula: editAula.trim() || 'Aula General',
        horario: horarioString,
        fecha_inicio: editFechaInicio,
        fecha_fin: editFechaFin,
        dias_semana: editSelectedDays.join(', '),
        hora_inicio: editStartTime,
        hora_fin: editEndTime,
      });

      if (res.success) {
        setIsEditModalOpen(false);
        setEditingGrupo(null);
        loadGrupos();
      }
    } catch (err: any) {
      setEditErrorMsg(err.response?.data?.message || 'Error al actualizar la clase.');
    } finally {
      setEditSaving(false);
    }
  };

  const loadGrupos = async () => {
    try {
      setLoading(true);
      const res = await profesorApi.getGrupos();
      if (res.success) setGrupos(res.grupos);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportClassExcel = async (grupoId: number) => {
    try {
      const res = await profesorApi.getGrupoDetalle(grupoId);
      if (res.success && res.grupo) {
        const g = res.grupo;
        const alumnosData = (g.alumnos || []).map((al: any) => ({
          id: al.id,
          matricula: al.matricula,
          nombre: al.nombre,
          carrera: al.carrera,
          total_asistencias: al.asistencias_count || 0,
          total_sesiones: g.total_sesiones || 0,
          porcentaje_asistencia: al.asistencias_porcentaje || 0,
        }));
        exportReports.exportClassToExcel(g, alumnosData, user?.nombre || 'Docente CheckU');
      }
    } catch (err) {
      console.error('Error al exportar clase a Excel', err);
    }
  };

  const handleExportClassPDF = async (grupoId: number) => {
    try {
      const res = await profesorApi.getGrupoDetalle(grupoId);
      if (res.success && res.grupo) {
        const g = res.grupo;
        const alumnosData = (g.alumnos || []).map((al: any) => ({
          id: al.id,
          matricula: al.matricula,
          nombre: al.nombre,
          carrera: al.carrera,
          total_asistencias: al.asistencias_count || 0,
          total_sesiones: g.total_sesiones || 0,
          porcentaje_asistencia: al.asistencias_porcentaje || 0,
        }));
        exportReports.exportClassToPDF(g, alumnosData, user?.nombre || 'Docente CheckU');
      }
    } catch (err) {
      console.error('Error al exportar clase a PDF', err);
    }
  };

  useEffect(() => {
    loadGrupos();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materia || !codigo) {
      setErrorMsg('Materia y código de grupo son obligatorios.');
      return;
    }

    if (!fechaInicio || !fechaFin) {
      setErrorMsg('Las fechas de inicio y fin del cuatrimestre son requeridas.');
      return;
    }

    if (cuatriStats?.isNegative) {
      setErrorMsg('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    if (cuatriStats?.isExceeded) {
      setErrorMsg('Una clase está destinada a durar un cuatrimestre (máximo 4 meses / 125 días).');
      return;
    }

    if (selectedDays.length === 0) {
      setErrorMsg('Selecciona al menos un día para la clase.');
      return;
    }

    if (startTime >= endTime) {
      setErrorMsg('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    const definedSchedule = scheduleHelper.formatDefinedSchedule(selectedDays, startTime, endTime);

    try {
      setSaving(true);
      setErrorMsg('');
      const res = await profesorApi.createGrupo({
        nombre_materia: materia.trim(),
        codigo_grupo: codigo.trim().toUpperCase(),
        horario: definedSchedule,
        aula: aula.trim() || 'Aula General',
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        dias_semana: selectedDays.join(','),
        hora_inicio: startTime,
        hora_fin: endTime
      });
      if (res.success) {
        setIsModalOpen(false);
        setMateria('');
        setCodigo('');
        setAula('');
        setSelectedDays(['Lunes', 'Miércoles']);
        setStartTime('08:00');
        setEndTime('10:00');
        loadGrupos();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error al crear el salón.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (id: number, nombre: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el salón "${nombre}"?`)) {
      try {
        await profesorApi.deleteGrupo(id);
        loadGrupos();
      } catch (err) {
        alert('Error al eliminar el grupo');
      }
    }
  };

  const filtered = grupos.filter(
    (g) =>
      g.nombre_materia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.codigo_grupo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.aula.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <Head>
        <title>Salones y Cuatrimestre • CheckU</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#63B89F]/20 text-[#172B4D] px-3 py-1 rounded-full text-xs font-bold mb-1 border border-[#63B89F]/30">
              <Calendar className="w-3.5 h-3.5 text-[#63B89F]" />
              <span>Gestión de Cuatrimestre Universitario (4 Meses)</span>
            </div>
            <h1 className="text-2xl font-bold text-[#172B4D]">Gestión de Salones y Grupos</h1>
            <p className="text-xs text-[#6F7F8A]">
              Control de sesiones planeadas, pase de lista dinámico y registro de justificantes
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="checku-btn-primary flex items-center justify-center gap-2 text-xs shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Asignatura / Cuatrimestre</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#6F7F8A]" />
          <input
            type="text"
            placeholder="Buscar por materia, código o aula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-[#172B4D] focus:ring-2 focus:ring-[#63B89F] outline-none shadow-sm"
          />
        </div>

        {/* Group Cards Grid */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-4 border-[#A8D8C8] border-t-[#63B89F] rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 shadow-sm">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#172B4D]">No se encontraron salones</h3>
            <p className="text-xs text-[#6F7F8A] mt-1 mb-4">
              Crea tu primera clase de cuatrimestre con fechas fijas de inicio y fin para calcular sesiones automáticamente.
            </p>
            <button onClick={() => setIsModalOpen(true)} className="checku-btn-primary text-xs">
              Crear Nuevo Salón
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((grupo) => {
              const scheduleStatus = scheduleHelper.analyzeSchedule(grupo.horario);
              const sesionesImpartidas = grupo.sesiones_impartidas ?? grupo.total_sesiones ?? 0;
              const sesionesPlaneadas = grupo.total_sesiones_planeadas || 32;
              const avancePct = Math.min(100, Math.round((sesionesImpartidas / sesionesPlaneadas) * 100));

              return (
                <div
                  key={grupo.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Code & Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-[#63B89F]/15 text-[#172B4D]">
                        {grupo.codigo_grupo}
                      </span>
                      {grupo.sesion_activa ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          QR Activo ({grupo.sesion_activa_codigo_pin ? `PIN: ${grupo.sesion_activa_codigo_pin}` : 'En vivo'})
                        </span>
                      ) : scheduleStatus.isToday ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          {scheduleStatus.badgeText}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#6F7F8A] bg-gray-100 px-2 py-0.5 rounded-full">
                          Cuatrimestre
                        </span>
                      )}
                    </div>

                    {/* Subject title */}
                    <h3 className="text-base font-bold text-[#172B4D] leading-snug line-clamp-2">
                      {grupo.nombre_materia}
                    </h3>

                    {/* Meta info */}
                    <div className="mt-3 space-y-1.5 text-xs text-[#6F7F8A]">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>Aula: <strong className="text-[#172B4D]">{grupo.aula}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>Horario: <strong className="text-[#172B4D]">{grupo.horario}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          Periodo: <strong className="text-[#172B4D]">
                            {grupo.fecha_inicio ? `${grupo.fecha_inicio} al ${grupo.fecha_fin}` : '4 Meses'}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>Alumnos inscritos: <strong className="text-[#172B4D]">{grupo.total_alumnos || 0}</strong></span>
                      </div>
                    </div>

                    {/* Cuatrimestre Sessions Progress Bar */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-[#172B4D]">Avance del Cuatrimestre</span>
                        <span className="font-mono font-bold text-[#63B89F]">
                          {sesionesImpartidas} / {sesionesPlaneadas} clases ({avancePct}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-[#63B89F] to-[#A8D8C8] transition-all"
                          style={{ width: `${avancePct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-[#6F7F8A]">
                        <span>Restantes: {Math.max(0, sesionesPlaneadas - sesionesImpartidas)} clases</span>
                        <span>Máx faltas permitidas: {grupo.max_faltas_permitidas || 6}</span>
                      </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[11px] text-[#6F7F8A] block">Justificantes</span>
                        <span className="font-bold text-[#172B4D]">{grupo.total_justificantes || 0}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-[#6F7F8A] block">Asistencia Promedio</span>
                        <span className={`font-black ${grupo.porcentaje_asistencia >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                          {grupo.porcentaje_asistencia || 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center gap-2">
                    <Link
                      href={`/grupos/${grupo.id}`}
                      className="flex-1 text-center py-2 px-3 bg-gray-50 hover:bg-[#63B89F]/10 hover:text-[#172B4D] border border-gray-200 hover:border-[#63B89F]/30 rounded-xl text-xs font-bold text-[#172B4D] transition"
                    >
                      Ver Detalles y Justificantes
                    </Link>
                    <button
                      onClick={() => handleExportClassExcel(grupo.id)}
                      title="Exportar reporte de este salón a Excel"
                      className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition shadow-sm"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleExportClassPDF(grupo.id)}
                      title="Exportar reporte de este salón a PDF"
                      className="p-2 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition shadow-sm"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(grupo)}
                      title="Editar clase y horario"
                      className="p-2 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition shadow-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(grupo.id, grupo.nombre_materia)}
                      title="Eliminar salón"
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Crear Salón con Cuatrimestre y Horario Definido */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#63B89F]/20 text-[#172B4D] flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5 text-[#63B89F]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#172B4D]">Nueva Clase de Cuatrimestre</h3>
                    <p className="text-[11px] text-[#6F7F8A]">
                      Duración máxima: 4 meses con cálculo automático de sesiones
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                    Nombre de la Asignatura
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Inteligencia Artificial Aplicada"
                    value={materia}
                    onChange={(e) => setMateria(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#63B89F]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                      Código de Grupo
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. IAA-601"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#63B89F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                      Aula / Laboratorio
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Lab Cómputo B-4"
                      value={aula}
                      onChange={(e) => setAula(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#63B89F]"
                    />
                  </div>
                </div>

                {/* Cuatrimestre Exact Dates Range */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#63B89F]" />
                      <label className="text-xs font-bold text-[#172B4D] uppercase">
                        Vigencia del Cuatrimestre (Máx. 4 meses)
                      </label>
                    </div>
                    {cuatriStats && !cuatriStats.isExceeded && !cuatriStats.isNegative && (
                      <span className="text-[11px] font-bold bg-[#63B89F] text-white px-2.5 py-0.5 rounded-full">
                        {cuatriStats.months} meses ({cuatriStats.diffDays} días)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Fecha Inicio
                      </label>
                      <input
                        type="date"
                        required
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-[#172B4D] outline-none focus:ring-2 focus:ring-[#63B89F]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Fecha Fin
                      </label>
                      <input
                        type="date"
                        required
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-[#172B4D] outline-none focus:ring-2 focus:ring-[#63B89F]"
                      />
                    </div>
                  </div>

                  {/* Real-time Cuatrimestre Calculation Info Card */}
                  {cuatriStats?.isExceeded ? (
                    <div className="p-3 bg-red-100 border border-red-300 rounded-xl flex items-start gap-2 text-red-800 text-xs">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Límite excedido:</strong> El cuatrimestre no puede durar más de 4 meses (125 días). La duración actual es de {cuatriStats.diffDays} días (~{cuatriStats.months} meses).
                      </span>
                    </div>
                  ) : cuatriStats?.isNegative ? (
                    <div className="p-3 bg-amber-100 border border-amber-300 rounded-xl text-amber-800 text-xs">
                      La fecha de fin debe ser posterior a la fecha de inicio.
                    </div>
                  ) : cuatriStats ? (
                    <div className="p-3 bg-white border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#6F7F8A] block">Sesiones calculadas:</span>
                        <strong className="text-base text-[#172B4D] font-black">
                          {cuatriStats.sessionCount} sesiones planeadas
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[#6F7F8A] block">Límite de faltas (20%):</span>
                        <strong className="text-sm text-emerald-700 font-bold">
                          Máx. {cuatriStats.maxFaltas} faltas
                        </strong>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Structured Defined Schedule Builder */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-[#63B89F]" />
                    <label className="text-xs font-bold text-[#172B4D] uppercase">
                      Horario Fijo de Clase
                    </label>
                  </div>
                  <p className="text-[11px] text-[#6F7F8A]">
                    Selecciona los días de la semana para el cálculo automático de clases:
                  </p>

                  {/* Day Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {scheduleHelper.diasDisponibles.map((day) => {
                      const isSelected = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                            isSelected
                              ? 'bg-[#172B4D] text-white shadow-sm'
                              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-[#63B89F]" />}
                          <span>{day}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Hours Dropdowns */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Hora Inicio
                      </label>
                      <select
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-[#172B4D] outline-none focus:ring-2 focus:ring-[#63B89F]"
                      >
                        {scheduleHelper.horasDisponibles.map((h) => (
                          <option key={h} value={h}>
                            {h} hrs
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Hora Fin
                      </label>
                      <select
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-[#172B4D] outline-none focus:ring-2 focus:ring-[#63B89F]"
                      >
                        {scheduleHelper.horasDisponibles.map((h) => (
                          <option key={h} value={h}>
                            {h} hrs
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Defined Schedule Preview Card */}
                  <div className="mt-2 p-2.5 bg-[#63B89F]/10 border border-[#63B89F]/30 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-[#6F7F8A]">Horario resultante:</span>
                    <span className="font-bold text-[#172B4D]">
                      {scheduleHelper.formatDefinedSchedule(selectedDays, startTime, endTime) || 'Selecciona horario'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-[#6F7F8A] hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || Boolean(cuatriStats?.isExceeded) || Boolean(cuatriStats?.isNegative)}
                    className="checku-btn-primary text-xs disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Crear Salón Cuatrimestral'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Editar Clase y Modificar Horario / Cuatrimestre */}
        {isEditModalOpen && editingGrupo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#172B4D]">Modificar Clase y Horario</h3>
                    <p className="text-xs text-[#6F7F8A]">
                      Actualiza la materia, aula, fechas del cuatrimestre y horario de clase semanal
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editErrorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{editErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleUpdateGroup} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                      Materia *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Estructura de Datos"
                      value={editMateria}
                      onChange={(e) => setEditMateria(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium text-[#172B4D] outline-none focus:ring-2 focus:ring-[#63B89F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                      Código del Grupo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. EDA-401"
                      value={editCodigo}
                      onChange={(e) => setEditCodigo(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono font-bold text-[#172B4D] uppercase outline-none focus:ring-2 focus:ring-[#63B89F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] uppercase mb-1">
                    Aula Asignada
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Laboratorio Alfa-2 o Aula 104"
                    value={editAula}
                    onChange={(e) => setEditAula(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium text-[#172B4D] outline-none focus:ring-2 focus:ring-[#63B89F]"
                  />
                </div>

                {/* Cuatrimestre Dates Modifier */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#172B4D]">
                    <Calendar className="w-4 h-4 text-[#63B89F]" />
                    <span>Fechas del Cuatrimestre (Máximo 4 meses)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#6F7F8A] mb-1">
                        Fecha de Inicio
                      </label>
                      <input
                        type="date"
                        required
                        value={editFechaInicio}
                        onChange={(e) => setEditFechaInicio(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-medium outline-none focus:ring-2 focus:ring-[#63B89F]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#6F7F8A] mb-1">
                        Fecha de Fin
                      </label>
                      <input
                        type="date"
                        required
                        value={editFechaFin}
                        onChange={(e) => setEditFechaFin(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-medium outline-none focus:ring-2 focus:ring-[#63B89F]"
                      />
                    </div>
                  </div>

                  {(() => {
                    const stats = getCuatrimestreStats(editFechaInicio, editFechaFin, editSelectedDays);
                    if (!stats) return null;
                    return (
                      <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
                        stats.isExceeded || stats.isNegative
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {stats.isNegative
                              ? 'La fecha de fin debe ser posterior a la de inicio.'
                              : stats.isExceeded
                              ? `Excede el cuatrimestre (${stats.diffDays} días / ${stats.months} meses). Máx. 125 días.`
                              : `Duración: ${stats.diffDays} días (~${stats.months} meses)`}
                          </span>
                        </div>
                        {!stats.isExceeded && !stats.isNegative && (
                          <div className="font-bold text-right text-[11px]">
                            <span>{stats.sessionCount} sesiones planeadas</span>
                            <span className="block text-[10px] text-emerald-600 font-normal">
                              Límite 20% faltas: {stats.maxFaltas}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Schedule Modifier */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#172B4D]">
                    <Clock className="w-4 h-4 text-[#63B89F]" />
                    <span>Modificar Horario y Días de Clase</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#6F7F8A] mb-1.5">
                      Días de la Semana:
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day) => {
                        const isSelected = editSelectedDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleEditDay(day)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                              isSelected
                                ? 'bg-[#63B89F] text-white border-[#63B89F] shadow-sm'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#6F7F8A] mb-1">
                        Hora de Inicio
                      </label>
                      <input
                        type="time"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-medium outline-none focus:ring-2 focus:ring-[#63B89F]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#6F7F8A] mb-1">
                        Hora de Término
                      </label>
                      <input
                        type="time"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-medium outline-none focus:ring-2 focus:ring-[#63B89F]"
                      />
                    </div>
                  </div>

                  <div className="p-2 bg-[#63B89F]/10 border border-[#63B89F]/30 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-[#6F7F8A]">Horario resultante:</span>
                    <span className="font-bold text-[#172B4D]">
                      {editSelectedDays.join(', ')} | {editStartTime} - {editEndTime}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-[#6F7F8A] hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="checku-btn-primary text-xs disabled:opacity-50"
                  >
                    {editSaving ? 'Guardando cambios...' : 'Guardar Cambios de Clase'}
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
