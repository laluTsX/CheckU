import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { qrApi, profesorApi } from '@/services/api';
import {
  ArrowLeft,
  Clock,
  Users,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Maximize,
  Radio,
  Volume2,
  VolumeX,
  AlertTriangle,
  QrCode
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AsistenciaItem {
  id: number;
  alumno_matricula: string;
  alumno_nombre: string;
  alumno_carrera: string;
  fecha_registro: string;
  estado: string;
}

export default function ProyectorAula() {
  const router = useRouter();
  const { id } = router.query;

  const [grupo, setGrupo] = useState<any>(null);
  const [sesion, setSesion] = useState<any>(null);
  const [asistencias, setAsistencias] = useState<AsistenciaItem[]>([]);
  const [stats, setStats] = useState({ total_inscritos: 0, total_registrados: 0, porcentaje_asistencia: 0 });
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [minutos, setMinutos] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const prevAsistenciasCount = useRef<number>(0);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Play gentle chime sound when an attendance is registered
  const playAttendanceChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {
      // AudioContext not allowed or unsupported
    }
  };

  // Generate or start a QR session
  const initSession = async (min = minutos) => {
    if (!id) return;
    try {
      setGenerating(true);
      const res = await qrApi.generarQR(id as string, min);
      if (res.success) {
        setSesion(res.sesion);
        setTimeLeft(res.sesion.segundos_restantes);
        prevAsistenciasCount.current = 0;
        setAsistencias([]);
      }
    } catch (err) {
      console.error('Error generando QR', err);
    } finally {
      setGenerating(false);
    }
  };

  // Poll for live attendance updates
  const pollLiveAttendance = async (token: string) => {
    try {
      const res = await qrApi.getSesionAsistencias(token);
      if (res.success) {
        const newAsistencias: AsistenciaItem[] = res.asistencias;
        setStats(res.estadisticas);
        setTimeLeft(res.sesion.segundos_restantes);
        if (res.sesion?.codigo_pin) {
          setSesion((prev: any) => prev ? { ...prev, codigo_pin: res.sesion.codigo_pin } : res.sesion);
        }

        // Detect new attendance scans
        if (newAsistencias.length > prevAsistenciasCount.current) {
          playAttendanceChime();
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#63B89F', '#A8D8C8', '#FFFFFF']
          });
        }
        prevAsistenciasCount.current = newAsistencias.length;
        setAsistencias(newAsistencias);
      }
    } catch (err) {
      console.error('Error polling asistencias', err);
    }
  };

  // Initial group fetch & session generation
  useEffect(() => {
    if (!id) return;

    const loadInitial = async () => {
      try {
        setLoading(true);
        const groupRes = await profesorApi.getGrupoDetalle(id as string);
        if (groupRes.success) {
          setGrupo(groupRes.grupo);
          // If group already has an active session, use it, else generate new
          if (groupRes.grupo.sesion_activa && groupRes.grupo.sesion_activa.is_valid) {
            setSesion(groupRes.grupo.sesion_activa);
            setTimeLeft(groupRes.grupo.sesion_activa.segundos_restantes || 600);
          } else {
            await initSession(minutos);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, [id]);

  // Polling loop
  useEffect(() => {
    if (!sesion?.token_qr) return;

    // Immediately fetch
    pollLiveAttendance(sesion.token_qr);

    pollingInterval.current = setInterval(() => {
      pollLiveAttendance(sesion.token_qr);
    }, 2500);

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [sesion?.token_qr]);

  // Countdown timer clock
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleCloseSession = async () => {
    if (!sesion?.token_qr) return;
    if (confirm('¿Deseas finalizar la sesión de pase de lista ahora? Los alumnos ya no podrán escanear este código.')) {
      try {
        await qrApi.cerrarSesionQR(sesion.token_qr);
        setSesion((prev: any) => ({ ...prev, activo: false, is_valid: false }));
        setTimeLeft(0);
      } catch (err) {
        alert('Error al cerrar sesión');
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isExpired = timeLeft <= 0;

  return (
    <div className="min-h-screen bg-[#0D1828] text-white flex flex-col justify-between select-none">
      <Head>
        <title>Proyector de Pase de Lista • {grupo?.nombre_materia || 'CheckU'}</title>
      </Head>

      {/* Top Bar for Projector */}
      <header className="border-b border-gray-800 bg-[#172B4D]/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/grupos/${id}`}
            className="text-gray-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold bg-gray-800/80 hover:bg-gray-800 py-1.5 px-3 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Salir del Proyector</span>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-[#63B89F] text-[#172B4D] px-2 py-0.5 rounded">
                {grupo?.codigo_grupo || 'CLASE'}
              </span>
              <h1 className="text-lg font-bold text-white tracking-tight">
                {grupo?.nombre_materia || 'Cargando Asignatura...'}
              </h1>
            </div>
            <p className="text-xs text-[#A8D8C8] mt-0.5">
              Aula: {grupo?.aula || 'Aula General'} • Horario: {grupo?.horario}
            </p>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-3">
          {/* Session duration selector */}
          <div className="hidden sm:flex items-center gap-1.5 bg-gray-800/80 p-1 rounded-xl text-xs">

            {[15, 30, 60, 120].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMinutos(m);
                  initSession(m);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  minutos === m
                    ? 'bg-[#63B89F] text-[#172B4D]'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
                title={`Vigencia de ${m} minutos para esta clase`}
              >
                {m}m
              </button>
            ))}
          </div>

          <button
            onClick={() => initSession(minutos)}
            className="checku-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            title="Genera un código QR único y actualizado para una nueva sesión de clase"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nueva Clase (Nuevo QR)</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
            title={soundEnabled ? 'Sonido activado' : 'Sonido desactivado'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#63B89F]" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
            title="Pantalla Completa"
          >
            <Maximize className="w-4 h-4" />
          </button>

          {sesion?.is_valid && !isExpired && (
            <button
              onClick={handleCloseSession}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-semibold py-1.5 px-3 rounded-lg transition flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Finalizar</span>
            </button>
          )}
        </div>
      </header>


      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Huge QR Code & Timer */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-[#63B89F]/20 border border-[#63B89F]/40 text-[#A8D8C8] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-[#63B89F] animate-pulse" />
            <span>Escanea con tu aplicación CheckU Móvil</span>
          </div>

          {/* QR Container */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#63B89F] to-[#A8D8C8] rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative bg-white p-6 rounded-3xl shadow-2xl border-4 border-[#63B89F]/30 flex flex-col items-center">
              {generating || loading ? (
                <div className="w-72 h-72 sm:w-80 sm:h-80 flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 border-4 border-[#63B89F] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold text-[#172B4D]">Generando Código QR Dinámico...</span>
                </div>
              ) : isExpired ? (
                <div className="w-72 h-72 sm:w-80 sm:h-80 flex flex-col items-center justify-center gap-3 p-6 text-center text-[#172B4D]">
                  <AlertTriangle className="w-16 h-16 text-amber-500 mb-2" />
                  <p className="text-base font-bold">Código QR Expirado</p>
                  <p className="text-xs text-[#6F7F8A]">
                    El tiempo de validez para este código ha caducado por motivos de seguridad.
                  </p>
                  <button
                    onClick={() => initSession(10)}
                    className="checku-btn-primary text-xs mt-3"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Generar Nuevo Código (10m)</span>
                  </button>
                </div>
              ) : sesion?.qr_image ? (
                /* High-res base64 QR Code generated on backend */
                <img
                  src={sesion.qr_image}
                  alt="Código QR Asistencia CheckU"
                  className="w-72 h-72 sm:w-80 sm:h-80 object-contain rounded-xl"
                />
              ) : (
                <div className="w-72 h-72 flex items-center justify-center text-xs text-[#6F7F8A]">
                  No se pudo cargar el QR
                </div>
              )}

              {/* 3-Digit PIN Display Banner */}
              {!isExpired && sesion?.codigo_pin && (
                <div className="mt-4 p-4 bg-[#172B4D] rounded-2xl w-full flex flex-col items-center justify-center border-2 border-[#63B89F] shadow-lg">
                  <span className="text-xs font-bold text-[#A8D8C8] uppercase tracking-wider">
                    CÓDIGO RÁPIDO DE ASISTENCIA
                  </span>
                  <div className="flex items-center gap-2 mt-1.5 mb-1">
                    {String(sesion.codigo_pin).split('').map((digit, i) => (
                      <span
                        key={i}
                        className="w-12 h-14 bg-[#0D1828] border-2 border-[#63B89F] rounded-xl flex items-center justify-center text-3xl font-black text-[#63B89F] font-mono shadow-inner"
                      >
                        {digit}
                      </span>
                    ))}
                  </div>
                  <span className="text-[11px] text-gray-300 mt-1 text-center">
                    Escribe este PIN de 3 dígitos o escanea el QR en la app
                  </span>
                </div>
              )}

              {/* Bottom badge */}
              {!isExpired && sesion?.token_qr && (
                <div className="mt-3 pt-3 border-t border-gray-100 w-full flex items-center justify-between text-[11px] text-[#6F7F8A] font-mono">
                  <span>TOKEN COMPLETO:</span>
                  <span className="font-bold text-[#172B4D]">{sesion.token_qr}</span>
                </div>
              )}
            </div>
          </div>

          {/* Countdown timer badge */}
          <div className="flex items-center gap-3 bg-[#172B4D] border border-gray-700 px-6 py-3 rounded-2xl shadow-lg">
            <Clock className={`w-6 h-6 ${isExpired ? 'text-red-400' : 'text-[#63B89F]'}`} />
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                {isExpired ? 'ESTADO DE SESIÓN' : 'TIEMPO RESTANTE DE VIGENCIA'}
              </span>
              <span
                className={`text-2xl font-black font-mono tracking-widest ${
                  isExpired ? 'text-red-400' : timeLeft < 60 ? 'text-amber-400 animate-pulse' : 'text-[#63B89F]'
                }`}
              >
                {isExpired ? 'EXPIRADO' : formatTime(timeLeft)}
              </span>
            </div>

            {!isExpired && (
              <button
                onClick={() => initSession(10)}
                title="Extender 10 minutos"
                className="ml-3 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 hover:text-white transition flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#63B89F]" />
                <span>Renovar</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Live Attendance Feed & Real-time Roster */}
        <div className="lg:col-span-5 bg-[#172B4D] border border-gray-700/80 rounded-3xl p-6 shadow-2xl flex flex-col h-[560px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-700">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#63B89F] animate-ping"></span>
                <h2 className="text-base font-bold text-white">Asistencia en Vivo</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Se actualiza en tiempo real automáticamente</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-[#63B89F]">
                {stats.total_registrados} / {stats.total_inscritos}
              </span>
              <span className="text-[10px] uppercase block text-gray-400 font-bold">Presentes</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="my-4">
            <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#63B89F] to-[#A8D8C8] h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, stats.porcentaje_asistencia)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 mt-1 font-medium">
              <span>Cuórum de clase</span>
              <span className="text-[#A8D8C8] font-bold">{stats.porcentaje_asistencia}%</span>
            </div>
          </div>

          {/* Scanned students real-time feed */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {asistencias.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-4">
                <Users className="w-10 h-10 text-gray-600 mb-2" />
                <p className="text-sm font-semibold text-gray-300">Esperando escaneos...</p>
                <p className="text-xs text-gray-500 max-w-xs mt-1">
                  Los alumnos deben apuntar su cámara al código QR desde la app móvil de CheckU.
                </p>
              </div>
            ) : (
              asistencias.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-[#0D1828]/60 hover:bg-[#0D1828] border border-gray-700/70 rounded-xl p-3 flex items-center justify-between transition-all animate-fadeIn"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#63B89F] text-[#172B4D] font-black text-xs flex items-center justify-center flex-shrink-0">
                      {item.alumno_nombre.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">
                        {item.alumno_nombre}
                      </p>
                      <span className="text-[11px] font-mono text-[#A8D8C8]">
                        {item.alumno_matricula}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#63B89F] bg-[#63B89F]/10 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>PRESENTE</span>
                    </span>
                    <span className="block text-[10px] text-gray-400 font-mono mt-0.5">
                      {new Date(item.fecha_registro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Footer Instructions */}
      <footer className="border-t border-gray-800 bg-[#172B4D]/40 px-6 py-3 text-center text-xs text-gray-400 flex items-center justify-center gap-4">
        <span>CheckU Aula Inteligente</span>
        <span>•</span>
        <span>Código QR con firma temporal y prevención de duplicados</span>
      </footer>
    </div>
  );
}
