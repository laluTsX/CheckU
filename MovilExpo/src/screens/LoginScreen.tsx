import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import COLORS from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, setCustomApiUrl, mobileApi, getDetectedServerHost } from '../services/api';

export const LoginScreen: React.FC = () => {
  // Requirement: Default role is 'alumno'
  const [role, setRole] = useState<'alumno' | 'profesor'>('alumno');
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [customIp, setCustomIp] = useState(getApiUrl());
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  const { loginAlumno, loginProfesor, isLoading } = useAuth();

  const testConnection = async () => {
    setConnectionStatus('checking');
    try {
      const res = await mobileApi.checkHealth();
      if (res.success) {
        setConnectionStatus('connected');
        setCustomIp(getApiUrl());
      } else {
        setConnectionStatus('error');
      }
    } catch {
      setConnectionStatus('error');
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const handleLogin = async () => {
    setErrorMsg('');
    if (!matricula.trim()) {
      setErrorMsg(
        role === 'alumno'
          ? 'Por favor ingresa tu matrícula oficial de alumno.'
          : 'Por favor ingresa tu matrícula o nómina de profesor.'
      );
      return;
    }

    if (role === 'profesor' && !password.trim()) {
      setErrorMsg('Ingresa tu contraseña institucional de profesor.');
      return;
    }

    if (role === 'alumno') {
      const res = await loginAlumno(matricula.trim().toUpperCase());
      if (!res.success) {
        setErrorMsg(res.message || 'Matrícula no encontrada en CheckU.');
        testConnection();
      }
    } else {
      const res = await loginProfesor(matricula.trim(), password.trim());
      if (!res.success) {
        setErrorMsg(res.message || 'Credenciales de docente inválidas.');
        testConnection();
      }
    }
  };

  const fillStudentDemo = (mat: string) => {
    setRole('alumno');
    setMatricula(mat);
    setPassword('');
    setErrorMsg('');
  };

  const fillTeacherDemo = () => {
    setRole('profesor');
    setMatricula('DOC-202401');
    setPassword('Password123!');
    setErrorMsg('');
  };

  const applyPresetIp = (ip: string) => {
    const url = `http://${ip}:5000/api`;
    setCustomIp(url);
    setCustomApiUrl(url);
    testConnection();
  };

  const saveApiUrl = () => {
    setCustomApiUrl(customIp);
    setShowConfig(false);
    testConnection();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>✓</Text>
            </View>
            <Text style={styles.brandTitle}>
              Check<Text style={{ color: COLORS.green }}>U</Text>
            </Text>
            <Text style={styles.brandSubtitle}>Control de Asistencia Universitario</Text>

            {/* Connection Status Pill */}
            <TouchableOpacity
              onPress={() => setShowConfig(!showConfig)}
              style={[
                styles.statusPill,
                connectionStatus === 'connected' && styles.statusPillConnected,
                connectionStatus === 'error' && styles.statusPillError,
              ]}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.statusDot,
                  connectionStatus === 'connected' && { backgroundColor: '#34D399' },
                  connectionStatus === 'error' && { backgroundColor: '#F87171' },
                ]}
              />
              <Text style={styles.statusPillText}>
                {connectionStatus === 'checking'
                  ? 'Verificando backend...'
                  : connectionStatus === 'connected'
                  ? `Servidor Conectado (${getApiUrl().replace('http://', '').replace('/api', '')})`
                  : '🔴 Sin conexión (Toca aquí para configurar IP)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Role Toggle: Default is Alumno */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleTab, role === 'alumno' && styles.toggleTabActive]}
              onPress={() => {
                setRole('alumno');
                setPassword('');
                setErrorMsg('');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, role === 'alumno' && styles.toggleTextActive]}>
                👨‍🎓 Soy Alumno
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleTab, role === 'profesor' && styles.toggleTabActive]}
              onPress={() => {
                setRole('profesor');
                setErrorMsg('');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, role === 'profesor' && styles.toggleTextActive]}>
                👨‍🏫 Soy Profesor
              </Text>
            </TouchableOpacity>
          </View>

          {/* Main Form Card */}
          <View style={styles.card}>
            <Text style={styles.formTitle}>
              {role === 'alumno' ? 'Acceso de Estudiante' : 'Acceso para Profesores'}
            </Text>
            <Text style={styles.formSubtitle}>
              {role === 'alumno'
                ? 'Ingresa únicamente tu matrícula para ver tu horario y registrar tu asistencia.'
                : 'Ingresa con tu matrícula/nómina docente y contraseña institucional.'}
            </Text>

            {errorMsg ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Matricula Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {role === 'alumno' ? 'Matrícula Oficial del Alumno' : 'Nómina o Matrícula del Profesor'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={role === 'alumno' ? 'Ej. A01700101 o 222210644' : 'Ej. DOC-202401'}
                placeholderTextColor={COLORS.slate}
                value={matricula}
                onChangeText={(text) => setMatricula(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            {/* Password input: ONLY for profesor */}
            {role === 'profesor' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña Institucional</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.slate}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {role === 'alumno' ? 'Ingresar como Alumno' : 'Ingresar como Profesor'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Quick Demo Fill Buttons */}
            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>Cuentas registradas en el sistema:</Text>
              {role === 'alumno' ? (
                <View style={styles.demoChips}>
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={() => fillStudentDemo('222210644')}
                  >
                    <Text style={styles.chipText}>222210644 (Miguel)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={() => fillStudentDemo('A01700101')}
                  >
                    <Text style={styles.chipText}>A01700101 (Sofía)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={() => fillStudentDemo('A01700102')}
                  >
                    <Text style={styles.chipText}>A01700102 (Mateo)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={() => fillStudentDemo('A01700103')}
                  >
                    <Text style={styles.chipText}>A01700103 (Valentina)</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.teacherDemoButton} onPress={fillTeacherDemo}>
                  <Text style={styles.teacherDemoText}>
                    ⚡ Autocompletar: DOC-202401 (Dr. Carlos Mendoza)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Server Config Accordion */}
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowConfig(!showConfig)}
          >
            <Text style={styles.configToggleText}>
              ⚙ Configuración de Conexión: {getApiUrl()}
            </Text>
          </TouchableOpacity>

          {showConfig && (
            <View style={styles.configBox}>
              <Text style={styles.configLabel}>IP del Backend en tu PC:</Text>
              <TextInput
                style={styles.configInput}
                value={customIp}
                onChangeText={setCustomIp}
                placeholder="http://10.172.251.161:5000/api"
                autoCapitalize="none"
              />

              <Text style={[styles.configLabel, { marginTop: 6 }]}>Opciones Rápidas de Red:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => applyPresetIp('10.172.251.161')}
                >
                  <Text style={styles.presetChipText}>Wi-Fi: 10.172.251.161</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => applyPresetIp('192.168.137.1')}
                >
                  <Text style={styles.presetChipText}>Hotspot: 192.168.137.1</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => applyPresetIp(getDetectedServerHost())}
                >
                  <Text style={styles.presetChipText}>Auto: {getDetectedServerHost()}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.configSaveButton, { flex: 1 }]} onPress={saveApiUrl}>
                  <Text style={styles.configSaveButtonText}>Guardar y Probar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.configSaveButton, { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)' }]}
                  onPress={testConnection}
                >
                  <Text style={styles.configSaveButtonText}>Reintentar Conexión</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  logoBadgeText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '900',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.mint,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 10,
    gap: 6,
  },
  statusPillConnected: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  statusPillError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FBBF24',
  },
  statusPillText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleTabActive: {
    backgroundColor: COLORS.green,
  },
  toggleText: {
    color: COLORS.slate,
    fontSize: 13,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: COLORS.white,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.navy,
  },
  formSubtitle: {
    fontSize: 12,
    color: COLORS.slate,
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
  },
  submitButton: {
    backgroundColor: COLORS.green,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.slate,
    marginBottom: 8,
  },
  demoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.navy,
  },
  teacherDemoButton: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  teacherDemoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  configToggle: {
    alignItems: 'center',
    marginTop: 18,
  },
  configToggleText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  configBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
  },
  configLabel: {
    color: COLORS.mint,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  configInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 10,
    color: COLORS.white,
    fontSize: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  presetChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  presetChipText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  configSaveButton: {
    backgroundColor: COLORS.green,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  configSaveButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default LoginScreen;
