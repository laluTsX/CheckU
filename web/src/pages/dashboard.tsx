import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { profesorApi } from '@/services/api';
import scheduleHelper from '@/utils/scheduleHelper';
import {
  Users,
  BookOpen,
  Calendar,
  CheckCircle,
  QrCode,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  Radio,
  Sparkles,
  CalendarClock
} from 'lucide-react';

interface Grupo {
  id: number;
  nombre_materia: string;
  codigo_grupo: string;
  aula: string;
  horario: string;
  total_alumnos: number;
  porcentaje_asistencia: number;
  total_sesiones: number;
  sesion_activa: boolean;
  sesion_activa_token?: string;
  sesion_activa_codigo_pin?: string;
}

interface Metricas {
  total_grupos: number;
  total_alumnos: number;
  total_sesiones: number;
  total_asistencias: number;
  porcentaje_asistencia_promedio: number;
  sesiones_activas_count: number;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && user?.role === 'admin') {
      router.replace('/admin');
    }
  }, [user, isLoading, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [gruposRes, metricasRes] = await Promise.all([
        profesorApi.getGrupos(),
        profesorApi.getMetricas(),
      ]);
      if (gruposRes.success) setGrupos(gruposRes.grupos || []);
      if (metricasRes.success) setMetricas(metricasRes.metricas || null);
    } catch (err) {
      console.error('Error al cargar datos del dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter today's classes and upcoming classes
  const clasesConEstado = grupos.map((g) => ({
    ...g,
    scheduleStatus: scheduleHelper.analyzeSchedule(g.horario),
  }));

  const clasesHoy = clasesConEstado.filter((c) => c.scheduleStatus.isToday);
  const otrasClases = clasesConEstado.filter((c) => !c.scheduleStatus.isToday);

  return (
    <Layout>
      <Head>
        <title>Dashboard Docente • CheckU</title>
      </Head>

      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-[#172B4D] via-[#1E3A5F] to-[#0D1828] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#63B89F]/20 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-[#63B89F]/20 text-[#A8D8C8] px-3 py-1 rounded-full text-xs font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-[#63B89F] animate-pulse"></span>
              Sistema de Asistencia en Tiempo Real
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Bienvenido, {user?.nombre || 'Profesor'}
            </h1>
            <p className="text-sm text-gray-300 mt-1 max-w-2xl leading-relaxed">
              Supervisa tus asignaturas, consulta las clases que estás por dar hoy e inicia pases de lista dinámicos con código QR y PIN de 3 dígitos.
            </p>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="checku-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#6F7F8A] uppercase tracking-wider">Salones / Grupos</p>
                <h3 className="text-2xl font-extrabold text-[#172B4D] mt-1">{metricas?.total_grupos ?? 0}</h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#63B89F]/15 flex items-center justify-center text-[#63B89F]">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-[#6F7F8A]">
              <span>Asignaturas activas este periodo</span>
            </div>
          </div>

          <div className="checku-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#6F7F8A] uppercase tracking-wider">Alumnos Totales</p>
                <h3 className="text-2xl font-extrabold text-[#172B4D] mt-1">{metricas?.total_alumnos ?? 0}</h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-[#172B4D]">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-[#6F7F8A]">
              <span>Inscritos en tus grupos</span>
            </div>
          </div>

          <div className="checku-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#6F7F8A] uppercase tracking-wider">Asistencia Promedio</p>
                <h3 className="text-2xl font-extrabold text-[#172B4D] mt-1">
                  {metricas?.porcentaje_asistencia_promedio ?? 0}%
                </h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#A8D8C8]/30 flex items-center justify-center text-[#63B89F]">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-[#6F7F8A]">
              <span>Tasa global acumulada</span>
            </div>
          </div>

          <div className="checku-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#6F7F8A] uppercase tracking-wider">Sesiones en Vivo</p>
                <h3 className="text-2xl font-extrabold text-[#172B4D] mt-1">
                  {metricas?.sesiones_activas_count ?? 0}
                </h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-[#6F7F8A]">
              <span>{metricas?.sesiones_activas_count ? 'Clase con pase de lista activo' : 'Sin sesiones activas'}</span>
            </div>
          </div>
        </div>

        {/* Section: Clases por Dar (Agenda de Hoy / Próximas) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#172B4D] text-[#63B89F] flex items-center justify-center">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#172B4D]">Clases por Impartir (Agenda del Día)</h2>
                <p className="text-[11px] text-[#6F7F8A]">
                  Asignaturas programadas para el día de hoy y próximas a impartir
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-[#63B89F]/15 text-[#172B4D] rounded-full self-start sm:self-auto">
              {clasesHoy.length} {clasesHoy.length === 1 ? 'clase hoy' : 'clases hoy'}
            </span>
          </div>

          {clasesHoy.length === 0 ? (
            <div className="p-6 bg-gray-50 rounded-xl text-center">
              <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#172B4D]">No tienes clases programadas para hoy</p>
              <p className="text-[11px] text-[#6F7F8A] mt-0.5">
                Tus clases están programadas en otros días de la semana.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clasesHoy.map((clase) => {
                const isOngoing = clase.scheduleStatus.status === 'EN_CURSO';
                return (
                  <div
                    key={clase.id}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                      clase.sesion_activa
                        ? 'bg-emerald-50/60 border-emerald-300 shadow-sm'
                        : isOngoing
                        ? 'bg-[#63B89F]/10 border-[#63B89F]'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-mono font-bold bg-[#172B4D] text-[#A8D8C8] px-2 py-0.5 rounded">
                          {clase.codigo_grupo}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            clase.sesion_activa
                              ? 'bg-green-100 text-green-800 animate-pulse'
                              : isOngoing
                              ? 'bg-emerald-100 text-emerald-800 font-bold'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {clase.sesion_activa
                            ? `● PASE ACTIVO (PIN: ${clase.sesion_activa_codigo_pin || 'En vivo'})`
                            : clase.scheduleStatus.badgeText}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[#172B4D]">{clase.nombre_materia}</h3>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#6F7F8A]">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span>{clase.aula}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{clase.horario}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between gap-2">
                      <span className="text-xs text-[#6F7F8A]">
                        {clase.total_alumnos} alumnos
                      </span>
                      <Link
                        href={`/proyector/${clase.id}`}
                        className="checku-btn-primary text-xs py-1.5 px-3"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{clase.sesion_activa ? 'Ver Pantalla QR' : 'Iniciar Pase de Lista'}</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Grupos Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#172B4D]">Todos tus Salones y Asignaturas</h2>
              <p className="text-xs text-[#6F7F8A]">Catálogo completo de materias asignadas</p>
            </div>
            <Link
              href="/grupos"
              className="text-xs font-semibold text-[#63B89F] hover:text-[#52a78e] flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="checku-card p-6 h-48 animate-pulse bg-gray-100 rounded-xl"></div>
              ))}
            </div>
          ) : grupos.length === 0 ? (
            <div className="checku-card p-8 text-center">
              <BookOpen className="w-12 h-12 text-[#6F7F8A] mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#172B4D]">No tienes salones asignados aún</p>
              <Link href="/grupos" className="checku-btn-primary mt-4 inline-flex">
                Crear tu primer salón
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grupos.map((grupo) => (
                <div
                  key={grupo.id}
                  className="checku-card p-5 hover:border-[#63B89F]/50 transition-all shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-mono font-bold bg-[#172B4D] text-[#A8D8C8] px-2.5 py-0.5 rounded-md">
                          {grupo.codigo_grupo}
                        </span>
                        <h3 className="text-base font-bold text-[#172B4D] mt-2 leading-snug">
                          {grupo.nombre_materia}
                        </h3>
                      </div>
                      {grupo.sesion_activa && (
                        <span className="flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-300 animate-pulse">
                          <Radio className="w-3 h-3 text-emerald-600" />
                          <span>QR Activo {grupo.sesion_activa_codigo_pin ? `(PIN: ${grupo.sesion_activa_codigo_pin})` : ''}</span>
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[#6F7F8A]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#63B89F]" />
                        <span>Aula: <strong className="text-[#172B4D]">{grupo.aula}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#63B89F]" />
                        <span>{grupo.horario}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#6F7F8A]">Inscritos:</span>{' '}
                        <strong className="text-[#172B4D]">{grupo.total_alumnos} alumnos</strong>
                      </div>
                      <div>
                        <span className="text-[#6F7F8A]">Asistencia:</span>{' '}
                        <strong className="text-[#172B4D]">{grupo.porcentaje_asistencia}%</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                    <Link
                      href={`/grupos/${grupo.id}`}
                      className="text-xs font-semibold text-[#172B4D] hover:text-[#63B89F] transition"
                    >
                      Ver Detalles y Alumnos →
                    </Link>

                    <Link
                      href={`/proyector/${grupo.id}`}
                      className="checku-btn-primary text-xs py-1.5 px-3"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{grupo.sesion_activa ? 'Pantalla QR' : 'Tomar Asistencia'}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
