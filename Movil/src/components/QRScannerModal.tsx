import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import COLORS from '../theme/colors';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (tokenOrPin: string) => void;
  initialMode?: 'pin' | 'qr';
  activeClassName?: string;
}

const { width } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(width * 0.65, 230);

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  onClose,
  onScan,
  initialMode = 'pin',
  activeClassName,
}) => {
  const [activeMode, setActiveMode] = useState<'pin' | 'qr'>(initialMode);
  const [pinDigits, setPinDigits] = useState<string>('');
  const [manualToken, setManualToken] = useState('');
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setActiveMode(initialMode);
      setPinDigits('');
      setManualToken('');
      // Laser animation for camera tab
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, laserAnim]);

  const translateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_BOX_SIZE - 4],
  });

  const handleKeyPress = (digit: string) => {
    if (pinDigits.length < 3) {
      const nextPin = pinDigits + digit;
      setPinDigits(nextPin);
      if (nextPin.length === 3) {
        // Auto-submit when 3 digits are entered!
        setTimeout(() => {
          onScan(nextPin);
        }, 180);
      }
    }
  };

  const handleDelete = () => {
    if (pinDigits.length > 0) {
      setPinDigits(pinDigits.slice(0, -1));
    }
  };

  const handleManualSubmit = () => {
    if (activeMode === 'pin') {
      if (pinDigits.length === 3) {
        onScan(pinDigits);
      }
    } else {
      if (!manualToken.trim()) return;
      onScan(manualToken.trim());
      setManualToken('');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕ Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pase de Lista CheckU</Text>
          <View style={{ width: 70 }} />
        </View>

        {/* Mode Selector Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeMode === 'pin' && styles.tabButtonActive]}
            onPress={() => setActiveMode('pin')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeMode === 'pin' && styles.tabButtonTextActive]}>
              🔢 Código PIN (3 Dígitos)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeMode === 'qr' && styles.tabButtonActive]}
            onPress={() => setActiveMode('qr')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeMode === 'qr' && styles.tabButtonTextActive]}>
              📷 Escáner / Token QR
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          {/* Active class prompt banner if detected */}
          {activeClassName && (
            <View style={styles.activeBanner}>
              <Text style={styles.activeBannerTitle}>🟢 Pase de lista abierto en tu clase:</Text>
              <Text style={styles.activeBannerClass}>{activeClassName}</Text>
              <Text style={styles.activeBannerSubtitle}>
                Escanea el código QR que muestra tu profesor o teclea el PIN de clase.
              </Text>
            </View>
          )}

          {activeMode === 'pin' ? (
            /* PIN Mode: Clean & Fast 3-Digit Keypad */
            <View style={styles.pinContainer}>
              <Text style={styles.instructions}>
                Ingresa el código de 3 dígitos que proyecta tu profesor en clase
              </Text>

              {/* 3 Digits Display */}
              <View style={styles.digitRow}>
                {[0, 1, 2].map((i) => {
                  const digit = pinDigits[i] || '';
                  const isCurrent = pinDigits.length === i;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.digitBox,
                        digit ? styles.digitBoxFilled : isCurrent ? styles.digitBoxCurrent : null,
                      ]}
                    >
                      <Text style={styles.digitText}>{digit || '•'}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Numeric Keypad */}
              <View style={styles.keypad}>
                {[
                  ['1', '2', '3'],
                  ['4', '5', '6'],
                  ['7', '8', '9'],
                  ['C', '0', '✓'],
                ].map((row, rIdx) => (
                  <View key={rIdx} style={styles.keypadRow}>
                    {row.map((btn) => {
                      const isDelete = btn === 'C';
                      const isConfirm = btn === '✓';
                      return (
                        <TouchableOpacity
                          key={btn}
                          style={[
                            styles.keypadBtn,
                            isDelete && styles.keypadBtnDelete,
                            isConfirm && styles.keypadBtnConfirm,
                          ]}
                          onPress={() => {
                            if (isDelete) handleDelete();
                            else if (isConfirm) handleManualSubmit();
                            else handleKeyPress(btn);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.keypadBtnText,
                              isConfirm && styles.keypadBtnConfirmText,
                            ]}
                          >
                            {btn}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            /* QR / Token Mode: Camera Viewfinder Simulation + Token Input */
            <View style={styles.qrContainer}>
              <Text style={styles.instructions}>
                Apunta la cámara al código QR proyectado en la pantalla
              </Text>

              {/* Scanner Box */}
              <View style={styles.scannerBox}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />

                <Animated.View
                  style={[
                    styles.laser,
                    { transform: [{ translateY }] },
                  ]}
                />

                <View style={styles.scanPlaceholder}>
                  <Text style={styles.cameraIcon}>📷</Text>
                  <Text style={styles.cameraText}>Sensor de Escaneo Activo</Text>
                  <Text style={styles.cameraSubtext}>
                    (También puedes usar el PIN de 3 dígitos arriba)
                  </Text>
                </View>
              </View>

              <View style={styles.tokenManualBox}>
                <Text style={styles.drawerLabel}>O ingresa el token QR completo:</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. CHECKU-EDA-..."
                    placeholderTextColor="#94A3B8"
                    value={manualToken}
                    onChangeText={setManualToken}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleManualSubmit}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.submitButtonText}>Validar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(23, 43, 77, 0.95)',
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: COLORS.green,
  },
  tabButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.7,
  },
  tabButtonTextActive: {
    opacity: 1,
    color: COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBanner: {
    width: '90%',
    backgroundColor: 'rgba(99, 184, 159, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 184, 159, 0.4)',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
  },
  activeBannerTitle: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeBannerClass: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
    marginVertical: 4,
  },
  activeBannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  instructions: {
    color: COLORS.mint,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 16,
    maxWidth: 300,
    lineHeight: 18,
  },
  pinContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  digitRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  digitBox: {
    width: 68,
    height: 78,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxCurrent: {
    borderColor: COLORS.green,
    backgroundColor: 'rgba(99, 184, 159, 0.1)',
  },
  digitBoxFilled: {
    borderColor: COLORS.green,
    backgroundColor: 'rgba(99, 184, 159, 0.25)',
  },
  digitText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  keypadBtn: {
    flex: 1,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  keypadBtnDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  keypadBtnConfirm: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  keypadBtnText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '700',
  },
  keypadBtnConfirmText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '900',
  },
  qrContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  scannerBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    borderRadius: 20,
    backgroundColor: 'rgba(23, 43, 77, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(99, 184, 159, 0.3)',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  scanPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cameraIcon: {
    fontSize: 36,
    marginBottom: 6,
  },
  cameraText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '700',
  },
  cameraSubtext: {
    color: COLORS.mint,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  laser: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 3,
    backgroundColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: COLORS.green,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
  tokenManualBox: {
    width: '100%',
    backgroundColor: COLORS.navy,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 184, 159, 0.2)',
  },
  drawerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.mint,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORS.green,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
});

export default QRScannerModal;
