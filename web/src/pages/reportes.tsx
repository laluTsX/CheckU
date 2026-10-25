import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { profesorApi } from '@/services/api';
import exportReports from '@/utils/exportReports';
import {
  BarChart3,
  Filter,
  Calendar,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Download,
  BookOpen
} from 'lucide-react';

export default function ReportesIndex() {
  const { user } = useAuth();
  const [reportes, setReportes] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadData = async (grupoId?: string) => {
    try {
      setLoading(true);
      const [reportesRes, gruposRes] = await Promise.all([
        profesorApi.getReportes(grupoId),
        profesorApi.getGrupos(),
      ]);
      if (reportesRes.success) setReportes(reportesRes.reportes || []);
      if (gruposRes.success) setGrupos(gruposRes.grupos || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedGrupo);
  }, [selectedGrupo]);

  const handleExportGeneralExcel = () => {
    exportReports.exportGeneralToExcel(grupos, user?.nombre || 'Docente CheckU');
  };

  const handleExportGeneralPDF = () => {
    exportReports.exportGeneralToPDF(grupos, user?.nombre || 'Docente CheckU');
  };

  const handleExportSessionExcel = (sesion: any) => {
    const grupoData = {
      id: sesion.grupo_id,
      nombre_materia: sesion.materia,
      codigo_grupo: sesion.codigo_grupo,
      aula: sesion.aula,
      horario: sesion.horario || 'N/A',
      total_alumnos: sesion.total_inscritos,
      total_sesiones: 1,
      porcentaje_asistencia: sesion.porcentaje_asistencia,
    };
    const alumnosData = (sesion.asistencias || []).map((as: any, idx: number) => ({
      id: as.id || idx,
      matricula: as.alumno_matricula,
      nombre: as.alumno_nombre,
      carrera: as.alumno_carrera || 'N/A',
      total_asistencias: 1,
      total_sesiones: 1,
      porcentaje_asistencia: 100,
    }));
    exportReports.exportClassToExcel(grupoData, alumnosData, user?.nombre || 'Docente CheckU');
  };

  const handleExportSessionPDF = (sesion: any) => {
    const grupoData = {
      id: sesion.grupo_id,
      nombre_materia: sesion.materia,
      codigo_grupo: sesion.codigo_grupo,
      aula: sesion.aula,
      horario: sesion.horario || 'N/A',
      total_alumnos: sesion.total_inscritos,
      total_sesiones: 1,
      porcentaje_asistencia: sesion.porcentaje_asistencia,
    };
    const alumnosData = (sesion.asistencias || []).map((as: any, idx: number) => ({
      id: as.id || idx,
      matricula: as.alumno_matricula,
      nombre: as.alumno_nombre,
      carrera: as.alumno_carrera || 'N/A',
      total_asistencias: 1,
      total_sesiones: 1,
      porcentaje_asistencia: 100,
    }));
    exportReports.exportClassToPDF(grupoData, alumnosData, user?.nombre || 'Docente CheckU');
  };

  const handleExportClassExcel = async (grupoId: number | string) => {
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

  const handleExportClassPDF = async (grupoId: number | string) => {
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

  const activeGroup = grupos.find((g) => String(g.id) === String(selectedGrupo));

  return (
    <Layout>
      <Head>
        <title>Reportes de Asistencia • CheckU</title>
      </Head>

      <div className="space-y-6">
        {/* Header & Main Export Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-[#172B4D]">Reportes y Exportación de Asistencias</h1>
            <p className="text-xs text-[#6F7F8A] mt-1">
              Descarga reportes oficiales en Excel (.xlsx) y PDF de tus clases generales y de cada salón
            </p>
          </div>

          {/* Export general buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportGeneralExcel}
              disabled={grupos.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition shadow-sm disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Excel General</span>
            </button>

            <button
              onClick={handleExportGeneralPDF}
              disabled={grupos.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-red-800 bg-red-50 hover:bg-red-100 border border-red-300 transition shadow-sm disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-red-600" />
              <span>Exportar PDF General</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#6F7F8A]" />
            <span className="text-xs font-bold text-[#172B4D]">Filtrar por Asignatura:</span>
            <select
              value={selectedGrupo}
              onChange={(e) => setSelectedGrupo(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-[#172B4D] px-3 py-2 outline-none focus:ring-2 focus:ring-[#63B89F]"
            >
              <option value="">Todos los Salones ({grupos.length})</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.codigo_grupo} - {g.nombre_materia}
                </option>
              ))}
            </select>
          </div>

          {activeGroup && (
            <div className="text-xs text-[#6F7F8A]">
              Viendo sesiones de: <strong className="text-[#172B4D]">{activeGroup.nombre_materia}</strong> ({activeGroup.codigo_grupo})
            </div>
          )}
        </div>

        {/* Dedicated Class Export Banner if single class is selected */}
        {activeGroup && (
          <div className="bg-[#ECFDF5] border border-[#63B89F]/40 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1">
                <span>✓ Salón Seleccionado</span>
              </div>
              <h3 className="text-lg font-bold text-[#172B4D]">
                Reporte de {activeGroup.nombre_materia} ({activeGroup.codigo_grupo})
              </h3>
              <p className="text-xs text-[#047857] mt-1">
                Aula: <strong>{activeGroup.aula}</strong> • Horario: <strong>{activeGroup.horario}</strong> • {activeGroup.total_alumnos} alumnos inscritos • {activeGroup.porcentaje_asistencia}% asistencia global
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleExportClassExcel(activeGroup.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 transition shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Exportar Excel de Clase</span>
              </button>

              <button
                onClick={() => handleExportClassPDF(activeGroup.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-red-800 bg-white hover:bg-red-50 border border-red-300 transition shadow-sm"
              >
                <FileText className="w-4 h-4 text-red-600" />
                <span>Exportar PDF de Clase</span>
              </button>

              <button
                onClick={() => {
                  window.open(`http://localhost:5000/api/profesor/grupos/${activeGroup.id}/exportar-csv`, '_blank');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#172B4D] bg-white hover:bg-gray-50 border border-gray-300 transition shadow-sm"
                title="Descargar archivo CSV oficial"
              >
                <Download className="w-4 h-4 text-[#172B4D]" />
                <span>CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* Reports Feed */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-4 border-[#A8D8C8] border-t-[#63B89F] rounded-full animate-spin"></div>
          </div>
        ) : reportes.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 shadow-sm">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-[#172B4D]">No hay registros de sesiones para mostrar</p>
            <p className="text-xs text-[#6F7F8A] mt-1">
              Las sesiones de pase de lista que generes con QR o código PIN de 3 dígitos aparecerán listadas aquí con su detalle.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reportes.map((sesion) => (
              <div key={sesion.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-[#172B4D] text-[#A8D8C8] px-2.5 py-0.5 rounded-lg">
                        {sesion.codigo_grupo}
                      </span>
                      <h3 className="text-base font-bold text-[#172B4D]">{sesion.materia}</h3>
                      {sesion.activo ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          En Progreso {sesion.codigo_pin ? `(PIN: ${sesion.codigo_pin})` : ''}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">
                          Finalizada
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6F7F8A] mt-1.5">
                      Fecha: {new Date(sesion.fecha_creacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })} a las{' '}
                      {new Date(sesion.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Aula: {sesion.aula}
                      {sesion.codigo_pin && ` • PIN de 3 dígitos: ${sesion.codigo_pin}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-auto">
                    <div className="text-right">
                      <span className="text-[11px] text-[#6F7F8A] block">Asistieron</span>
                      <span className="text-lg font-black text-[#172B4D]">
                        {sesion.total_asistencias} / {sesion.total_inscritos}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-[#6F7F8A] block">% Quórum</span>
                      <span
                        className={`text-lg font-black ${
                          sesion.porcentaje_asistencia >= 80
                            ? 'text-green-600'
                            : sesion.porcentaje_asistencia >= 60
                            ? 'text-amber-600'
                            : 'text-red-500'
                        }`}
                      >
                        {sesion.porcentaje_asistencia}%
                      </span>
                    </div>

                    {/* Class Session Export buttons */}
                    <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200">
                      <button
                        onClick={() => handleExportSessionExcel(sesion)}
                        title="Exportar esta sesión a Excel"
                        className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleExportSessionPDF(sesion)}
                        title="Exportar esta sesión a PDF"
                        className="p-2 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Attendees expansion */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                      Alumnos Registrados ({sesion.asistencias?.length || 0}):
                    </p>
                  </div>
                  {sesion.asistencias && sesion.asistencias.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {sesion.asistencias.map((asist: any) => (
                        <div
                          key={asist.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-[#172B4D]">{asist.alumno_nombre}</p>
                            <span className="font-mono text-[11px] text-[#6F7F8A]">{asist.alumno_matricula}</span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                            {new Date(asist.fecha_registro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No se registraron asistencias en esta sesión.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
