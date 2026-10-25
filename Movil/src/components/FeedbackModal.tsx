import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import COLORS from '../theme/colors';

export type FeedbackType = 'success' | 'expired' | 'already_registered' | 'not_enrolled' | 'error';

interface FeedbackModalProps {
  visible: boolean;
  type: FeedbackType;
  title?: string;
  message?: string;
  details?: {
    materia?: string;
    aula?: string;
    hora?: string;
  };
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  type,
  title,
  message,
  details,
  onClose,
}) => {
  // Determine icons and colors based on feedback type
  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          iconText: '✓',
          badgeBg: '#E8F6F1',
          iconBg: COLORS.green,
          title: title || '¡Asistencia Registrada!',
          subtitle: message || 'Tu pase de lista se ha registrado exitosamente en el sistema CheckU.',
          accentColor: COLORS.green,
        };
      case 'expired':
        return {
          iconText: '⏱',
          badgeBg: '#FEF3C7',
          iconBg: '#F59E0B',
          title: title || 'Código QR Caducado',
          subtitle: message || 'El código QR ha expirado por motivos de seguridad. Solicita al profesor un código vigente.',
          accentColor: '#F59E0B',
        };
      case 'already_registered':
        return {
          iconText: 'ℹ',
          badgeBg: '#E0F2FE',
          iconBg: '#0284C7',
          title: title || 'Asistencia Ya Registrada',
          subtitle: message || 'Ya habías registrado tu asistencia para esta sesión con anterioridad.',
          accentColor: '#0284C7',
        };
      case 'not_enrolled':
        return {
          iconText: '✕',
          badgeBg: '#FEE2E2',
          iconBg: '#EF4444',
          title: title || 'No Estás Inscrito',
          subtitle: message || 'Tu matrícula no pertenece a la lista de este salón. Verifica con tu docente.',
          accentColor: '#EF4444',
        };
      default:
        return {
          iconText: '!',
          badgeBg: '#FEE2E2',
          iconBg: '#EF4444',
          title: title || 'Error al Registrar',
          subtitle: message || 'Ocurrió un problema al procesar el código QR.',
          accentColor: '#EF4444',
        };
    }
  };

  const config = getConfig();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Top accent ring */}
          <View style={[styles.iconContainer, { backgroundColor: config.badgeBg }]}>
            <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
              <Text style={styles.iconText}>{config.iconText}</Text>
            </View>
          </View>

          {/* Title and message */}
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>{config.subtitle}</Text>

          {/* Extra Details Box for Success */}
          {details && (details.materia || details.hora) && (
            <View style={styles.detailsBox}>
              {details.materia && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Materia:</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{details.materia}</Text>
                </View>
              )}
              {details.aula && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Aula:</Text>
                  <Text style={styles.detailValue}>{details.aula}</Text>
                </View>
              )}
              {details.hora && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Hora de Registro:</Text>
                  <Text style={[styles.detailValue, { color: COLORS.green, fontWeight: '700' }]}>
                    {details.hora}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Action button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: config.accentColor }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Aceptar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 24, 40, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: '900',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.slate,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.slate,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    color: COLORS.navy,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default FeedbackModal;
