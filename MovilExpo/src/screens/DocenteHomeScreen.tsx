import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Modal,
  Platform,
  FlatList,
  Image,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import COLORS from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { mobileApi } from '../services/api';
import { analyzeMobileSchedule } from '../utils/scheduleHelper';

export const DocenteHomeScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const [grupos, setGrupos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live session modal (Student attendee list)
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<any>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  // QR Creation Modal
  const [createQRModalVisible, setCreateQRModalVisible] = useState(false);
  const [selectedGrupoIdForQR, setSelectedGrupoIdForQR] = useState<number | null>(null);
  const [minutosVigencia, setMinutosVigencia] = useState(10);
  const [generatingQR, setGeneratingQR] = useState(false);

  // QR Display & Projector Modal (Teacher showing QR to classroom)
  const [qrDisplayModalVisible, setQrDisplayModalVisible] = useState(false);
  const [activeSessionData, setActiveSessionData] = useState<any>(null);
  const [qrCountdown, setQrCountdown] = useState(0);

  // Class Report Modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedGrupoForReport, setSelectedGrupoForReport] = useState<any>(null);
  const [reportDetail, setReportDetail] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const livePollRef = useRef<any>(null);

  const loadData = async () => {
    try {
      const res = await mobileApi.getGruposDocente();
      if (res.success) {
        setGrupos(res.grupos || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Live polling for attendance
  useEffect(() => {
    const tokenToPoll = selectedToken || activeSessionData?.token_qr;
    if (!tokenToPoll) {
      if (livePollRef.current) clearInterval(livePollRef.current);
      return;
    }

    const poll = async () => {
      try {
        const res = await mobileApi.getSesionAsistencias(tokenToPoll);
        if (res.success) {
          setLiveData(res);
          if (activeSessionData && res.sesion) {
            setActiveSessionData((prev: any) => ({
              ...prev,
              segundos_restantes: res.sesion.segundos_restantes,
              total_registrados: res.estadisticas?.total_registrados || 0,
            }));
          }
        }
      } catch (err) {
        console.error('Error polling attendance', err);
      }
    };

    poll();
    livePollRef.current = setInterval(poll, 3000);

    return () => {
      if (livePollRef.current) clearInterval(livePollRef.current);
    };
  }, [selectedToken, activeSessionData?.token_qr]);

  // Countdown clock for active QR session
  useEffect(() => {
    if (qrCountdown <= 0) return;
    const timer = setInterval(() => {
      setQrCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [qrCountdown]);

  // 1. Open QR creation modal
  const handleOpenCreateQR = (grupoId?: number) => {
    if (grupoId) {
      setSelectedGrupoIdForQR(grupoId);
    } else if (grupos.length > 0) {
      setSelectedGrupoIdForQR(grupos[0].id);
    }
    setMinutosVigencia(10);
    setCreateQRModalVisible(true);
  };

  // 2. Submit QR generation (Maestro creates QR)
  const handleGenerateQR = async () => {
    if (!selectedGrupoIdForQR) {
      Alert.alert('Atención', 'Selecciona un salón para iniciar el pase de lista.');
      return;
    }

    setGeneratingQR(true);
    try {
      const res = await mobileApi.generarQR(selectedGrupoIdForQR, minutosVigencia);
      if (res.success && res.sesion) {
        setActiveSessionData(res.sesion);
        setQrCountdown(res.sesion.segundos_restantes || minutosVigencia * 60);
        setCreateQRModalVisible(false);
        setQrDisplayModalVisible(true);
        loadData(); // reload groups so active status is reflected
      } else {
        Alert.alert('Error', res.message || 'No se pudo generar la sesión de pase de lista.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Ocurrió un error al generar el código QR.');
    } finally {
      setGeneratingQR(false);
    }
  };

  // 3. Open QR Projector/Display for an existing active session
  const handleViewActiveQR = async (token_qr: string) => {
    try {
      const res = await mobileApi.getSesionAsistencias(token_qr);
      if (res.success && res.sesion) {
        setActiveSessionData({
          ...res.sesion,
          total_registrados: res.estadisticas?.total_registrados || 0,
          total_inscritos: res.estadisticas?.total_inscritos || 0,
        });
        setQrCountdown(res.sesion.segundos_restantes || 300);
        setQrDisplayModalVisible(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Close / Finalize QR Session
  const handleCloseQRSession = async (token_qr: string) => {
    Alert.alert(
      'Finalizar Pase de Lista',
      '¿Deseas cerrar la sesión ahora? Los alumnos ya no podrán registrarse.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Finalizar',
          style: 'destructive',
          onPress: async () => {
            try {
              await mobileApi.cerrarSesionQR(token_qr);
              setQrDisplayModalVisible(false);
              setActiveSessionData(null);
              setSelectedToken(null);
              loadData();
              Alert.alert('Sesión Finalizada', 'El pase de lista ha sido cerrado correctamente.');
            } catch (err) {
              Alert.alert('Error', 'No se pudo cerrar la sesión.');
            }
          },
        },
      ]
    );
  };

  // 5. Open live attendee list modal
  const openLiveSession = async (token: string) => {
    setSelectedToken(token);
    setLiveLoading(true);
    try {
      const res = await mobileApi.getSesionAsistencias(token);
      if (res.success) {
        setLiveData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLiveLoading(false);
    }
  };

  const closeLiveSessionModal = () => {
    setSelectedToken(null);
    setLiveData(null);
  };

  // 6. View & Export class report
  const handleOpenReport = async (grupo: any) => {
    setSelectedGrupoForReport(grupo);
    setReportModalVisible(true);
    setReportLoading(true);
    try {
      const res = await mobileApi.getGrupoDetalle(grupo.id);
      if (res.success && res.grupo) {
        setReportDetail(res.grupo);
      }
    } catch (err) {
      console.error('Error loading report', err);
    } finally {
      setReportLoading(false);
    }
  };

  // 7. Share / Export Report via WhatsApp, Email, Notes, etc.
  const handleShareReport = async () => {
    if (!selectedGrupoForReport || !reportDetail) return;

    const g = selectedGrupoForReport;
    const alumnos = reportDetail.alumnos || [];
    const sesiones = reportDetail.total_sesiones || 0;

    let text = `📊 REPORTE DE ASISTENCIA - CHECKU\n`;
    text += `Asignatura: ${g.nombre_materia} (${g.codigo_grupo})\n`;
    text += `Docente: ${user?.nombre || 'Profesor'}\n`;
    text += `Aula: ${g.aula} | Horario: ${g.horario}\n`;
    text += `Total Alumnos: ${alumnos.length} | Sesiones Impartidas: ${sesiones}\n`;
    text += `Asistencia Promedio: ${g.porcentaje_asistencia}%\n`;
    text += `----------------------------------------\n`;
    text += `LISTA DE ALUMNOS:\n`;

    alumnos.forEach((al: any, idx: number) => {
      const pct = al.asistencias_porcentaje ?? 0;
      const count = al.asistencias_count ?? 0;
      const estatus = pct >= 80 ? 'APROBADO' : 'EN RIESGO';
      text += `${idx + 1}. ${al.nombre} (${al.matricula})\n`;
      text += `   Asistencias: ${count}/${sesiones} (${pct}%) [${estatus}]\n`;
    });

    text += `----------------------------------------\n`;
    text += `Reporte generado automáticamente desde la App Móvil CheckU`;

    try {
      await Share.share({
        message: text,
        title: `Reporte_${g.codigo_grupo}`,
      });
    } catch (err) {
      console.error('Error sharing report', err);
    }
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Active session today
  const activeGroup = grupos.find((g) => g.sesion_activa);

  // Classes scheduled for today
  const clasesHoy = grupos.filter((g) => {
    const analysis = analyzeMobileSchedule(g.horario);
    return analysis.isToday;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>DOCENTE</Text>
              </View>
              <Text style={styles.matriculaText}>{user?.matricula}</Text>
            </View>
            <Text style={styles.userName}>{user?.nombre || 'Profesor'}</Text>
            <Text style={styles.subText}>Panel de Control y Generador de QR</Text>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Big Start QR Roll Call Button */}
        <TouchableOpacity
          style={styles.headerStartQRButton}
          onPress={() => handleOpenCreateQR()}
          activeOpacity={0.85}
        >
          <Text style={styles.headerStartQRIcon}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerStartQRTitle}>Crear Pase de Lista QR</Text>
            <Text style={styles.headerStartQRSubtitle}>
              Genera el código QR y PIN de 3 dígitos para tus alumnos
            </Text>
          </View>
          <Text style={styles.headerStartQRArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.green]} />}
      >
        {/* Active QR Session Card */}
        {activeGroup ? (
          <View style={styles.liveCard}>
            <View style={styles.liveCardHeader}>
              <View style={styles.pulsingDot} />
              <Text style={styles.liveCardTitle}>Pase de Lista Activo en Clase</Text>
            </View>

            <Text style={styles.liveMateria}>{activeGroup.nombre_materia}</Text>
            <Text style={styles.liveMeta}>
              Aula: {activeGroup.aula} • Grupo: {activeGroup.codigo_grupo}
            </Text>

            {activeGroup.sesion_activa_codigo_pin && (
              <View style={styles.pinDisplayCard}>
                <Text style={styles.pinLabel}>CÓDIGO PIN DE ASISTENCIA:</Text>
                <View style={styles.pinDigitsRow}>
                  {String(activeGroup.sesion_activa_codigo_pin).split('').map((digit, idx) => (
                    <View key={idx} style={styles.pinDigitBox}>
                      <Text style={styles.pinDigitText}>{digit}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.pinHelp}>
                  Dicta este PIN de 3 dígitos a los alumnos o muéstrales el QR
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                style={[styles.liveButton, { flex: 1, backgroundColor: COLORS.navy }]}
                onPress={() => handleViewActiveQR(activeGroup.sesion_activa_token)}
                activeOpacity={0.85}
              >
                <Text style={styles.liveButtonText}>📱 Mostrar QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.liveButton, { flex: 1.2 }]}
                onPress={() => openLiveSession(activeGroup.sesion_activa_token)}
                activeOpacity={0.85}
              >
                <Text style={styles.liveButtonText}>
                  📋 Ver Lista ({activeGroup.total_alumnos || 0})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noLiveCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 18 }}>💡</Text>
              <Text style={styles.noLiveTitle}>Sin pase de lista activo en este momento</Text>
            </View>
            <Text style={styles.noLiveSub}>
              Como maestro, puedes crear y mostrar el código QR o dictar el PIN de 3 dígitos directamente desde tu teléfono para que los alumnos se registren.
            </Text>
            <TouchableOpacity
              style={styles.noLiveActionBtn}
              onPress={() => handleOpenCreateQR()}
              activeOpacity={0.85}
            >
              <Text style={styles.noLiveActionBtnText}>⚡ Iniciar Pase de Lista con QR</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Section 1: Clases por Impartir Hoy */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>📅 Clases por Impartir Hoy</Text>
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>{clasesHoy.length} hoy</Text>
            </View>
          </View>

          {loading ? (
            <Text style={styles.emptyText}>Cargando agenda de hoy...</Text>
          ) : clasesHoy.length === 0 ? (
            <View style={styles.emptyDayCard}>
              <Text style={styles.emptyDayTitle}>No tienes clases programadas para hoy</Text>
              <Text style={styles.emptyDaySub}>
                Revisa el catálogo general abajo para consultar tus clases en otros días.
              </Text>
            </View>
          ) : (
            clasesHoy.map((g) => {
              const schedule = analyzeMobileSchedule(g.horario);
              const isEnCurso = schedule.status === 'EN_CURSO';

              return (
                <View
                  key={`agenda-${g.id}`}
                  style={[
                    styles.groupCard,
                    isEnCurso && styles.inProgressCard,
                    g.sesion_activa && { borderColor: COLORS.green, borderWidth: 1.5 },
                  ]}
                >
                  <View style={styles.groupHeader}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeText}>{g.codigo_grupo}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        isEnCurso ? styles.statusPillLive : styles.statusPillUpcoming,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isEnCurso ? styles.statusTextLive : styles.statusTextUpcoming,
                        ]}
                      >
                        {schedule.badgeText}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.groupName}>{g.nombre_materia}</Text>

                  <View style={styles.groupDetails}>
                    <Text style={styles.detailText}>📍 Aula: {g.aula}</Text>
                    <Text style={styles.detailText}>🕒 Horario: {g.horario}</Text>
                    <Text style={styles.detailText}>👥 Alumnos inscritos: {g.total_alumnos}</Text>
                  </View>

                  {/* Class Actions */}
                  <View style={styles.cardActionsRow}>
                    {g.sesion_activa ? (
                      <TouchableOpacity
                        style={[styles.actionBtnPrimary, { flex: 1.2 }]}
                        onPress={() => handleViewActiveQR(g.sesion_activa_token)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnPrimaryText}>
                          🟢 QR Activo {g.sesion_activa_codigo_pin ? `(${g.sesion_activa_codigo_pin})` : ''}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionBtnPrimary, { flex: 1.2 }]}
                        onPress={() => handleOpenCreateQR(g.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnPrimaryText}>⚡ Iniciar Pase QR</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.actionBtnSecondary, { flex: 1 }]}
                      onPress={() => handleOpenReport(g)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnSecondaryText}>📊 Reporte</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Section 2: Todos los Grupos Asignados */}
        <View style={[styles.section, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>📚 Todos tus Salones Asignados</Text>

          {loading ? (
            <Text style={styles.emptyText}>Cargando información de salones...</Text>
          ) : grupos.length === 0 ? (
            <Text style={styles.emptyText}>No tienes salones asignados</Text>
          ) : (
            grupos.map((g) => (
              <View key={g.id} style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeBadgeText}>{g.codigo_grupo}</Text>
                  </View>
                  <Text style={styles.pctBadge}>{g.porcentaje_asistencia}% Asistencia</Text>
                </View>

                <Text style={styles.groupName}>{g.nombre_materia}</Text>

                <View style={styles.groupDetails}>
                  <Text style={styles.detailText}>📍 Aula: {g.aula}</Text>
                  <Text style={styles.detailText}>🕒 Horario: {g.horario}</Text>
                  <Text style={styles.detailText}>👥 {g.total_alumnos} Alumnos inscritos</Text>
                </View>

                <View style={styles.cardActionsRow}>
                  {g.sesion_activa ? (
                    <TouchableOpacity
                      style={[styles.actionBtnPrimary, { flex: 1.2 }]}
                      onPress={() => handleViewActiveQR(g.sesion_activa_token)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnPrimaryText}>
                        🟢 Mostrar QR {g.sesion_activa_codigo_pin ? `(${g.sesion_activa_codigo_pin})` : ''}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtnPrimary, { flex: 1.2 }]}
                      onPress={() => handleOpenCreateQR(g.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnPrimaryText}>⚡ Iniciar Pase QR</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtnSecondary, { flex: 1 }]}
                    onPress={() => handleOpenReport(g)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnSecondaryText}>📊 Ver Reporte</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* MODAL 1: Iniciar Pase de Lista (Crear QR) */}
      <Modal
        visible={createQRModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateQRModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.createModalCard}>
            <View style={styles.createModalHeader}>
              <View>
                <Text style={styles.createModalTitle}>⚡ Crear Pase de Lista</Text>
                <Text style={styles.createModalSubtitle}>
                  Genera el código QR y PIN para los alumnos
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCreateQRModalVisible(false)}
                style={styles.closeIconBtn}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.slate }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Select Group */}
            <Text style={styles.formSectionLabel}>1. SELECCIONA EL SALÓN / GRUPO:</Text>
            <ScrollView style={{ maxHeight: 180, marginBottom: 16 }}>
              {grupos.map((grp) => {
                const isSelected = grp.id === selectedGrupoIdForQR;
                return (
                  <TouchableOpacity
                    key={grp.id}
                    style={[styles.groupSelectOption, isSelected && styles.groupSelectOptionActive]}
                    onPress={() => setSelectedGrupoIdForQR(grp.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.groupSelectName, isSelected && { color: COLORS.navy }]}>
                        {grp.nombre_materia}
                      </Text>
                      <Text style={styles.groupSelectMeta}>
                        {grp.codigo_grupo} • Aula: {grp.aula} ({grp.total_alumnos} alumnos)
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && { borderColor: COLORS.green, backgroundColor: COLORS.green },
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Select Duration */}
            <Text style={styles.formSectionLabel}>2. TIEMPO DE VIGENCIA:</Text>
            <View style={styles.durationRow}>
              {[5, 10, 15, 20].map((min) => (
                <TouchableOpacity
                  key={min}
                  style={[styles.durationChip, minutosVigencia === min && styles.durationChipActive]}
                  onPress={() => setMinutosVigencia(min)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      minutosVigencia === min && styles.durationChipTextActive,
                    ]}
                  >
                    {min} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.createSubmitBtn}
              onPress={handleGenerateQR}
              disabled={generatingQR}
              activeOpacity={0.85}
            >
              {generatingQR ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.createSubmitText}>🚀 Generar Código QR y PIN</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Proyector / Pantalla QR para el Maestro */}
      <Modal
        visible={qrDisplayModalVisible}
        animationType="slide"
        onRequestClose={() => setQrDisplayModalVisible(false)}
      >
        <SafeAreaView style={styles.projectorSafe}>
          <View style={styles.projectorHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.projectorClassTitle}>
                {activeSessionData?.nombre_materia || 'Pase de Lista Activo'}
              </Text>
              <Text style={styles.projectorMeta}>
                Aula: {activeSessionData?.aula} • Grupo: {activeSessionData?.codigo_grupo}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setQrDisplayModalVisible(false)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕ Minimizar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.projectorContent}>
            {/* PIN Code Banner */}
            {activeSessionData?.codigo_pin && (
              <View style={styles.projectorPinCard}>
                <Text style={styles.projectorPinLabel}>CÓDIGO PIN DE CLASE:</Text>
                <View style={styles.pinDigitsRowLarge}>
                  {String(activeSessionData.codigo_pin).split('').map((digit, idx) => (
                    <View key={idx} style={styles.pinDigitBoxLarge}>
                      <Text style={styles.pinDigitTextLarge}>{digit}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.projectorPinHint}>
                  Dicta este código a los alumnos para registrarse sin escanear
                </Text>
              </View>
            )}

            {/* Base64 QR Image */}
            <View style={styles.qrImageContainer}>
              {activeSessionData?.qr_image ? (
                <Image
                  source={{ uri: activeSessionData.qr_image }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.qrImagePlaceholder}>
                  <Text style={{ fontSize: 36, marginBottom: 8 }}>📷</Text>
                  <Text style={{ color: COLORS.navy, fontWeight: '700', fontSize: 13 }}>
                    Código QR Generado
                  </Text>
                  <Text style={{ color: COLORS.slate, fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                    Token: {activeSessionData?.token_qr}
                  </Text>
                </View>
              )}
              <Text style={styles.qrInstructions}>
                Muestra esta pantalla a tus alumnos para que la escaneen con la App Móvil
              </Text>
            </View>

            {/* Timer & Live Counter Bar */}
            <View style={styles.liveStatsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>TIEMPO RESTANTE</Text>
                <Text style={[styles.statBoxValue, qrCountdown <= 60 && { color: '#EF4444' }]}>
                  {formatCountdown(qrCountdown)}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>ALUMNOS REGISTRADOS</Text>
                <Text style={[styles.statBoxValue, { color: COLORS.green }]}>
                  {activeSessionData?.total_registrados || liveData?.estadisticas?.total_registrados || 0}
                  {activeSessionData?.total_inscritos ? ` / ${activeSessionData.total_inscritos}` : ''}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={{ width: '100%', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={styles.viewLiveAttendeesBtn}
                onPress={() => {
                  setQrDisplayModalVisible(false);
                  openLiveSession(activeSessionData.token_qr);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.viewLiveAttendeesText}>
                  📋 Ver Lista de Alumnos en Vivo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeSessionBtn}
                onPress={() => handleCloseQRSession(activeSessionData.token_qr)}
                activeOpacity={0.85}
              >
                <Text style={styles.closeSessionText}>
                  ✕ Finalizar / Cerrar Pase de Lista
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* MODAL 3: Reporte Oficial de Asistencias por Salón / Clase */}
      <Modal
        visible={reportModalVisible}
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Reporte Oficial de Clase</Text>
              <Text style={styles.modalSub}>
                {selectedGrupoForReport?.nombre_materia} ({selectedGrupoForReport?.codigo_grupo})
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReportModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕ Cerrar</Text>
            </TouchableOpacity>
          </View>

          {reportLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={COLORS.green} />
              <Text style={[styles.emptyText, { marginTop: 12 }]}>Cargando reporte de la clase...</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {/* Summary Header Card */}
              <View style={styles.reportSummaryCard}>
                <View style={styles.reportSummaryCol}>
                  <Text style={styles.reportSummaryLabel}>AULA</Text>
                  <Text style={styles.reportSummaryVal}>{selectedGrupoForReport?.aula}</Text>
                </View>
                <View style={styles.reportSummaryCol}>
                  <Text style={styles.reportSummaryLabel}>SESIONES</Text>
                  <Text style={styles.reportSummaryVal}>{reportDetail?.total_sesiones || 0}</Text>
                </View>
                <View style={styles.reportSummaryCol}>
                  <Text style={styles.reportSummaryLabel}>ALUMNOS</Text>
                  <Text style={styles.reportSummaryVal}>{reportDetail?.alumnos?.length || 0}</Text>
                </View>
                <View style={styles.reportSummaryCol}>
                  <Text style={styles.reportSummaryLabel}>% ASISTENCIA</Text>
                  <Text
                    style={[
                      styles.reportSummaryVal,
                      { color: (selectedGrupoForReport?.porcentaje_asistencia || 0) >= 80 ? COLORS.green : '#F59E0B' },
                    ]}
                  >
                    {selectedGrupoForReport?.porcentaje_asistencia || 0}%
                  </Text>
                </View>
              </View>

              {/* Student list */}
              <FlatList
                data={reportDetail?.alumnos || []}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ padding: 20, paddingBottom: 90 }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', padding: 24 }}>
                    <Text style={styles.emptyText}>No hay alumnos inscritos en esta clase.</Text>
                  </View>
                }
                renderItem={({ item, index }) => {
                  const pct = item.asistencias_porcentaje ?? 0;
                  const isPassing = pct >= 80;
                  return (
                    <View style={styles.reportStudentRow}>
                      <View style={styles.indexCircle}>
                        <Text style={styles.indexText}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reportStudentName}>{item.nombre}</Text>
                        <Text style={styles.reportStudentMat}>{item.matricula} • {item.carrera || 'Ingeniería'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={styles.reportStudentCount}>
                          {item.asistencias_count ?? 0}/{reportDetail?.total_sesiones || 0} ({pct}%)
                        </Text>
                        <View style={[styles.statusTag, isPassing ? { backgroundColor: '#ECFDF5' } : { backgroundColor: '#FEF2F2' }]}>
                          <Text style={[styles.statusText, isPassing ? { color: '#059669' } : { color: '#DC2626' }]}>
                            {isPassing ? 'CUMPLE' : 'EN RIESGO'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                }}
              />

              {/* Bottom Share/Export Action Bar */}
              <View style={styles.reportBottomBar}>
                <TouchableOpacity
                  style={styles.shareReportBtn}
                  onPress={handleShareReport}
                  activeOpacity={0.85}
                >
                  <Text style={styles.shareReportIcon}>📤</Text>
                  <Text style={styles.shareReportText}>
                    Compartir / Exportar Reporte de esta Clase
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* MODAL 4: Lista de Asistencias en Vivo */}
      <Modal
        visible={!!selectedToken}
        animationType="slide"
        onRequestClose={closeLiveSessionModal}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Asistencia en Tiempo Real</Text>
              <Text style={styles.modalSub}>
                {liveData?.sesion?.nombre_materia || 'Sesión QR'} ({liveData?.estadisticas?.total_registrados || 0} registrados)
              </Text>
            </View>
            <TouchableOpacity onPress={closeLiveSessionModal} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕ Cerrar</Text>
            </TouchableOpacity>
          </View>

          {/* PIN Banner in Modal */}
          {liveData?.sesion?.codigo_pin && (
            <View style={styles.modalPinCard}>
              <View style={styles.modalPinLeft}>
                <Text style={styles.modalPinTitle}>CÓDIGO PIN DE ESTA SESIÓN</Text>
                <Text style={styles.modalPinSub}>
                  Los alumnos pueden teclear este código en su app para marcar asistencia
                </Text>
              </View>
              <View style={styles.modalPinBadge}>
                <Text style={styles.modalPinDigitText}>{liveData.sesion.codigo_pin}</Text>
              </View>
            </View>
          )}

          {liveLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={COLORS.green} />
              <Text style={[styles.emptyText, { marginTop: 12 }]}>Cargando asistencias...</Text>
            </View>
          ) : liveData?.asistencias?.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Aún no hay alumnos registrados en esta sesión.</Text>
              <Text style={[styles.emptyText, { fontSize: 12, marginTop: 4 }]}>
                Comparte el código PIN o muestra el código QR para que comiencen a registrarse.
              </Text>
            </View>
          ) : (
            <FlatList
              data={liveData?.asistencias || []}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 20 }}
              renderItem={({ item }) => (
                <View style={styles.attendeeRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.alumno_nombre.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attendeeName}>{item.alumno_nombre}</Text>
                    <Text style={styles.attendeeMat}>{item.alumno_matricula}</Text>
                  </View>
                  <View style={styles.statusTag}>
                    <Text style={styles.statusText}>PRESENTE</Text>
                  </View>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: COLORS.navy,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  roleTag: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleTagText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
  },
  matriculaText: {
    color: COLORS.mint,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  userName: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  headerStartQRButton: {
    backgroundColor: COLORS.green,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  headerStartQRIcon: {
    fontSize: 22,
  },
  headerStartQRTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  headerStartQRSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 1,
  },
  headerStartQRArrow: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  liveCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: COLORS.green,
    marginBottom: 20,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  liveCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  liveCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  liveMateria: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.navy,
  },
  liveMeta: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    marginBottom: 14,
  },
  liveButton: {
    backgroundColor: COLORS.green,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  liveButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  noLiveCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noLiveTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.navy,
  },
  noLiveSub: {
    fontSize: 12,
    color: COLORS.slate,
    marginTop: 4,
    lineHeight: 18,
  },
  noLiveActionBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  noLiveActionBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  section: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.navy,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.slate,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
  },
  groupCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeBadge: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeBadgeText: {
    color: COLORS.mint,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  pctBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.green,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 8,
  },
  groupDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.slate,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.green,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimaryText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  actionBtnSecondary: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtnSecondaryText: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: '700',
  },
  modalSafe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.navy,
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.slate,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: '900',
  },
  attendeeName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  attendeeMat: {
    fontSize: 11,
    color: COLORS.slate,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  statusTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '900',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pinDisplayCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  pinLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  pinDigitsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  pinDigitBox: {
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: COLORS.green,
    borderRadius: 10,
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDigitText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  pinHelp: {
    color: '#CBD5E1',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  counterBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  counterText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navy,
  },
  emptyDayCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyDayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 4,
  },
  emptyDaySub: {
    fontSize: 12,
    color: COLORS.slate,
    textAlign: 'center',
    lineHeight: 18,
  },
  inProgressCard: {
    borderColor: COLORS.green,
    borderWidth: 1.5,
    backgroundColor: '#F0FDF4',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillLive: {
    backgroundColor: '#DCFCE7',
  },
  statusPillUpcoming: {
    backgroundColor: '#FEF3C7',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusTextLive: {
    color: '#166534',
  },
  statusTextUpcoming: {
    color: '#92400E',
  },
  modalPinCard: {
    backgroundColor: '#0F172A',
    margin: 16,
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalPinLeft: {
    flex: 1,
    paddingRight: 12,
  },
  modalPinTitle: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalPinSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  modalPinBadge: {
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: COLORS.green,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalPinDigitText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  // Backdrop & Create Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  createModalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  createModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.navy,
  },
  createModalSubtitle: {
    fontSize: 12,
    color: COLORS.slate,
    marginTop: 2,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.navy,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  groupSelectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  groupSelectOptionActive: {
    borderColor: COLORS.green,
    backgroundColor: '#ECFDF5',
  },
  groupSelectName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate,
  },
  groupSelectMeta: {
    fontSize: 11,
    color: COLORS.slate,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  durationChipActive: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green,
  },
  durationChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
  durationChipTextActive: {
    color: COLORS.white,
  },
  createSubmitBtn: {
    backgroundColor: COLORS.green,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  createSubmitText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  // Projector / Display Modal
  projectorSafe: {
    flex: 1,
    backgroundColor: '#0D1828',
  },
  projectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  projectorClassTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
  },
  projectorMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  projectorContent: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  projectorPinCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 184, 159, 0.3)',
  },
  projectorPinLabel: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  pinDigitsRowLarge: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
  },
  pinDigitBoxLarge: {
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: COLORS.green,
    borderRadius: 14,
    width: 60,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDigitTextLarge: {
    color: COLORS.white,
    fontSize: 34,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  projectorPinHint: {
    color: '#CBD5E1',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
  qrImageContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  qrImage: {
    width: 230,
    height: 230,
  },
  qrImagePlaceholder: {
    width: 230,
    height: 230,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  qrInstructions: {
    fontSize: 11,
    color: COLORS.slate,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  liveStatsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statBoxLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statBoxValue: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  viewLiveAttendeesBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  viewLiveAttendeesText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  closeSessionBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeSessionText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '800',
  },
  // Report Modal
  reportSummaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  reportSummaryCol: {
    alignItems: 'center',
  },
  reportSummaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.slate,
  },
  reportSummaryVal: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.navy,
    marginTop: 2,
  },
  reportStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  indexCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.navy,
  },
  reportStudentName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  reportStudentMat: {
    fontSize: 11,
    color: COLORS.slate,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },
  reportStudentCount: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navy,
  },
  reportBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  shareReportBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareReportIcon: {
    fontSize: 18,
  },
  shareReportText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
});

export default DocenteHomeScreen;
