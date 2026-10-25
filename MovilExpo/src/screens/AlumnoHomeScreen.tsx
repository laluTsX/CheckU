import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import COLORS from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { mobileApi } from '../services/api';
import QRScannerModal from '../components/QRScannerModal';
import FeedbackModal, { FeedbackType } from '../components/FeedbackModal';

export const AlumnoHomeScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'horario' | 'asistencias'>('horario');
  const [horario, setHorario] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [resumenMaterias, setResumenMaterias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Scanner & Feedback state
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerMode, setScannerMode] = useState<'pin' | 'qr'>('qr');
  const [selectedClassName, setSelectedClassName] = useState<string | undefined>(undefined);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('success');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackDetails, setFeedbackDetails] = useState<any>(null);

  const loadData = async () => {
    try {
      const [hRes, aRes] = await Promise.all([
        mobileApi.getHorario(),
        mobileApi.getAsistencias(),
      ]);

      if (hRes.success) setHorario(hRes.horario || []);
      if (aRes.success) {
        setAsistencias(aRes.historial_asistencias || []);
        setResumenMaterias(aRes.resumen_materias || []);
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

  const handleScanQR = async (token_qr: string) => {
    setScannerVisible(false);

    if (!user) return;
    const res = await mobileApi.escanearQR(token_qr, user.matricula);

    if (res.success) {
      setFeedbackType('success');
      setFeedbackTitle('¡Asistencia Registrada!');
      setFeedbackMessage(res.message);
      setFeedbackDetails({
        materia: res.asistencia?.materia,
        aula: res.asistencia?.aula,
        hora: res.asistencia?.hora_formateada,
      });
      setFeedbackVisible(true);
      loadData(); // reload stats
    } else {
      // Map error code to modal type
      const code = res.code || '';
      if (code === 'QR_EXPIRED') {
        setFeedbackType('expired');
        setFeedbackTitle('Código QR Caducado');
        setFeedbackMessage(res.message || 'El código QR ha expirado. Solicita al profesor un código vigente.');
      } else if (code === 'ALREADY_REGISTERED') {
        setFeedbackType('already_registered');
        setFeedbackTitle('Ya Registrado');
        setFeedbackMessage(res.message || 'Tu asistencia ya había sido registrada para esta sesión.');
      } else if (code === 'NOT_ENROLLED') {
        setFeedbackType('not_enrolled');
        setFeedbackTitle('No Inscrito en el Grupo');
        setFeedbackMessage(res.message || 'No estás registrado en la lista de esta clase.');
      } else {
        setFeedbackType('error');
        setFeedbackTitle('No se pudo registrar');
        setFeedbackMessage(res.message || 'Ocurrió un error al procesar la asistencia.');
      }
      setFeedbackDetails(null);
      setFeedbackVisible(true);
    }
  };

  // Find active session among student classes
  const activeSessions = horario.filter((h) => h.sesion_activa);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Header Profile Card */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <View style={styles.badgeRow}>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>ALUMNO</Text>
              </View>
              <Text style={styles.matriculaText}>{user?.matricula}</Text>
            </View>
            <Text style={styles.userName}>{user?.nombre || 'Estudiante'}</Text>
            <Text style={styles.userCareer}>{user?.carrera || 'Ingeniería en Software'}</Text>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'horario' && styles.tabActive]}
            onPress={() => setActiveTab('horario')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'horario' && styles.tabTextActive]}>
              📅 Mis Clases de Hoy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'asistencias' && styles.tabActive]}
            onPress={() => setActiveTab('asistencias')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'asistencias' && styles.tabTextActive]}>
              📊 Mis Asistencias
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.green]} />}
      >
        {/* Active QR Session Alert Banner */}
        {activeSessions.length > 0 && (
          <View style={styles.alertBanner}>
            <View style={styles.alertHeader}>
              <View style={styles.pulsingDot} />
              <Text style={styles.alertTitle}>¡Pase de Lista Activo Ahora!</Text>
            </View>
            <Text style={styles.alertDesc}>
              {activeSessions[0].nombre_materia} ({activeSessions[0].aula})
            </Text>
            <Text style={styles.alertInstruction}>
              El maestro ha iniciado la asistencia. Escanea el código QR que se proyecta en el aula o introduce el PIN de clase dictado por tu profesor.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.alertButton, { flex: 1, backgroundColor: COLORS.navy, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}
                onPress={() => {
                  setSelectedClassName(activeSessions[0].nombre_materia);
                  setScannerMode('qr');
                  setScannerVisible(true);
                }}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 13 }}>📷</Text>
                <Text style={styles.alertButtonText}>Escanear QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.alertButton, { flex: 1, backgroundColor: COLORS.green, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}
                onPress={() => {
                  setSelectedClassName(activeSessions[0].nombre_materia);
                  setScannerMode('pin');
                  setScannerVisible(true);
                }}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 13 }}>🔢</Text>
                <Text style={styles.alertButtonText}>Colocar PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tab 1: Horario y Clases de Hoy */}
        {activeTab === 'horario' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Agenda de Clases y Horarios</Text>
            {loading ? (
              <Text style={styles.emptyText}>Cargando materias...</Text>
            ) : horario.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTitle}>Sin clases inscritas</Text>
                <Text style={styles.emptyCardSub}>Solicita a tu profesor que te agregue a su lista</Text>
              </View>
            ) : (
              horario.map((item) => (
                <View key={item.grupo_id} style={[styles.classCard, item.sesion_activa && { borderColor: COLORS.green, borderWidth: 1.5 }]}>
                  <View style={styles.classHeader}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeText}>{item.codigo_grupo}</Text>
                    </View>
                    {item.sesion_activa ? (
                      <View style={[styles.liveTag, { backgroundColor: '#DCFCE7' }]}>
                        <Text style={[styles.liveTagText, { color: '#166534' }]}>
                          • Pase de Lista Activo
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.className}>{item.nombre_materia}</Text>

                  <View style={styles.classMeta}>
                    <Text style={styles.classMetaText}>📍 Aula: {item.aula}</Text>
                    <Text style={styles.classMetaText}>🕒 {item.horario}</Text>
                    <Text style={styles.classMetaText}>👨‍🏫 Prof. {item.profesor_nombre}</Text>
                  </View>

                  {item.sesion_activa && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: COLORS.navy,
                          paddingVertical: 10,
                          borderRadius: 10,
                          alignItems: 'center',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          gap: 6
                        }}
                        onPress={() => {
                          setSelectedClassName(item.nombre_materia);
                          setScannerMode('qr');
                          setScannerVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 13 }}>📷</Text>
                        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>
                          Escanear QR
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: COLORS.green,
                          paddingVertical: 10,
                          borderRadius: 10,
                          alignItems: 'center',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          gap: 6
                        }}
                        onPress={() => {
                          setSelectedClassName(item.nombre_materia);
                          setScannerMode('pin');
                          setScannerVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 13 }}>🔢</Text>
                        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>
                          Colocar PIN
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab 2: Mis Asistencias */}
        {activeTab === 'asistencias' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Porcentaje por Asignatura</Text>
            {resumenMaterias.map((m) => (
              <View key={m.grupo_id} style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryName}>{m.nombre_materia}</Text>
                  <Text style={[styles.summaryPct, { color: m.porcentaje_asistencia >= 80 ? COLORS.green : '#F59E0B' }]}>
                    {m.porcentaje_asistencia}%
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, m.porcentaje_asistencia)}%`,
                        backgroundColor: m.porcentaje_asistencia >= 80 ? COLORS.green : '#F59E0B',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.summarySub}>
                  {m.asistencias_registradas} de {m.sesiones_totales} asistencias registradas
                </Text>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Historial Reciente</Text>
            {asistencias.length === 0 ? (
              <Text style={styles.emptyText}>Aún no tienes asistencias registradas</Text>
            ) : (
              asistencias.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyLeft}>
                    <View style={styles.historyCheckBadge}>
                      <Text style={styles.historyCheckText}>✓</Text>
                    </View>
                    <View>
                      <Text style={styles.historyMateria}>{item.materia}</Text>
                      <Text style={styles.historyDate}>
                        {item.fecha} a las {item.hora}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.presenteBadge}>
                    <Text style={styles.presenteBadgeText}>PRESENTE</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Buttons for Students: Escanear QR o Colocar PIN */}
      <View style={styles.floatingButtonContainer}>
        <View style={styles.dualActionRow}>
          <TouchableOpacity
            style={[styles.floatingButton, { flex: 1.1 }]}
            onPress={() => {
              setScannerMode('qr');
              setSelectedClassName(activeSessions[0]?.nombre_materia);
              setScannerVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.floatingButtonIcon}>📷</Text>
            <Text style={styles.floatingButtonText}>Escanear QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.floatingButtonPin, { flex: 0.9 }]}
            onPress={() => {
              setScannerMode('pin');
              setSelectedClassName(activeSessions[0]?.nombre_materia);
              setScannerVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.floatingButtonPinIcon}>🔢</Text>
            <Text style={styles.floatingButtonPinText}>Colocar PIN</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals */}
      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleScanQR}
        initialMode={scannerMode}
        activeClassName={selectedClassName || activeSessions[0]?.nombre_materia}
      />

      <FeedbackModal
        visible={feedbackVisible}
        type={feedbackType}
        title={feedbackTitle}
        message={feedbackMessage}
        details={feedbackDetails}
        onClose={() => setFeedbackVisible(false)}
      />
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
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  roleTag: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleTagText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
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
  userCareer: {
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 3,
    marginTop: 18,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: COLORS.white,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mint,
  },
  tabTextActive: {
    color: COLORS.navy,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  alertBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: COLORS.green,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  alertDesc: {
    fontSize: 13,
    color: '#047857',
    fontWeight: '700',
    marginBottom: 4,
  },
  alertInstruction: {
    fontSize: 11,
    color: '#065F46',
    lineHeight: 16,
    marginBottom: 6,
  },
  alertButton: {
    backgroundColor: COLORS.green,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  alertButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.navy,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.slate,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
  },
  emptyCardSub: {
    fontSize: 12,
    color: COLORS.slate,
    marginTop: 4,
  },
  classCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  classHeader: {
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
  liveTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveTagText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  className: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 8,
  },
  classMeta: {
    gap: 4,
  },
  classMetaText: {
    fontSize: 12,
    color: COLORS.slate,
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
    flex: 1,
    marginRight: 8,
  },
  summaryPct: {
    fontSize: 16,
    fontWeight: '900',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  summarySub: {
    fontSize: 11,
    color: COLORS.slate,
    fontWeight: '500',
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyCheckBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCheckText: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: '900',
  },
  historyMateria: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  historyDate: {
    fontSize: 11,
    color: COLORS.slate,
    marginTop: 2,
  },
  presenteBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  presenteBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  dualActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  floatingButton: {
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingButtonIcon: {
    fontSize: 20,
  },
  floatingButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  floatingButtonPin: {
    backgroundColor: COLORS.green,
    flexDirection: 'row',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingButtonPinIcon: {
    fontSize: 20,
  },
  floatingButtonPinText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
});

export default AlumnoHomeScreen;
