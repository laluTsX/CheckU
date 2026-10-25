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
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import COLORS from '../theme/colors';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (tokenOrPin: string) => void;
  initialMode?: 'pin' | 'qr';
  activeClassName?: string;
}

const { width } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(width * 0.7, 250);

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  onClose,
  onScan,
  initialMode = 'qr',
  activeClassName,
}) => {
  const [activeMode, setActiveMode] = useState<'pin' | 'qr'>(initialMode);
  const [pinDigits, setPinDigits] = useState<string>('');
  const [manualToken, setManualToken] = useState('');
  const [scanned, setScanned] = useState(false);
  const laserAnim = useRef(new Animated.Value(0)).current;

  // Expo Camera permissions hook
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (visible) {
      setActiveMode(initialMode);
      setPinDigits('');
      setManualToken('');
      setScanned(false);

      // Automatically request camera permission when opened if not yet granted
      if (!permission?.granted) {
        requestPermission();
      }

      // Laser scanning line animation
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
  }, [visible, initialMode, permission?.granted]);

  const translateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_BOX_SIZE - 6],
  });

  const handleBarcodeScanned = (scanningResult: BarcodeScanningResult) => {
    if (scanned) return;
    const { data } = scanningResult;
    if (data && data.trim()) {
      setScanned(true);
      onScan(data.trim());
    }
  };

  const handleKeyPress = (digit: string) => {
    if (pinDigits.length < 3) {
      const nextPin = pinDigits + digit;
      setPinDigits(nextPin);
      if (nextPin.length === 3) {
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
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕ Cerrar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Registro de Asistencia</Text>
          <View style={{ width: 65 }} />
        </View>

        {/* Mode Selector Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeMode === 'qr' && styles.tabButtonActive]}
            onPress={() => {
              setActiveMode('qr');
              setScanned(false);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeMode === 'qr' && styles.tabButtonTextActive]}>
              📷 Escanear con Cámara
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeMode === 'pin' && styles.tabButtonActive]}
            onPress={() => setActiveMode('pin')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeMode === 'pin' && styles.tabButtonTextActive]}>
              🔢 PIN (3 Dígitos)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Class Banner */}
        {activeClassName && (
          <View style={styles.activeBanner}>
            <Text style={styles.activeBannerTitle}>🟢 Pase de lista activo en tu clase:</Text>
            <Text style={styles.activeBannerClass}>{activeClassName}</Text>
          </View>
        )}

        {/* MODE 1: REAL CAMERA SCANNER */}
        {activeMode === 'qr' ? (
          <View style={styles.cameraWrapper}>
            {!permission ? (
              // Loading permission state
              <View style={styles.permissionBox}>
                <ActivityIndicator size="large" color={COLORS.green} />
                <Text style={styles.permissionText}>Comprobando permisos de cámara...</Text>
              </View>
            ) : !permission.granted ? (
              // Permission NOT granted
              <View style={styles.permissionBox}>
                <View style={styles.permissionIconBadge}>
                  <Text style={{ fontSize: 40 }}>📷</Text>
                </View>
                <Text style={styles.permissionTitle}>Permiso de Cámara Requerido</Text>
                <Text style={styles.permissionDesc}>
                  CheckU necesita acceso a tu cámara para escanear el código QR proyectado por el profesor en clase.
                </Text>
                <TouchableOpacity
                  style={styles.grantPermissionBtn}
                  onPress={requestPermission}
                  activeOpacity={0.8}
                >
                  <Text style={styles.grantPermissionText}>Permitir Acceso a la Cámara</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.fallbackPinBtn}
                  onPress={() => setActiveMode('pin')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fallbackPinText}>O usar Código PIN de 3 Dígitos</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Permission GRANTED: Render Real Camera
              <View style={styles.cameraContainer}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                />

                {/* Camera Overlay Viewfinder */}
                <View style={styles.overlay}>
                  <Text style={styles.cameraInstructions}>
                    Apunta la cámara al código QR proyectado en la pantalla
                  </Text>

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
                  </View>

                  {scanned && (
                    <View style={styles.scannedBadge}>
                      <ActivityIndicator size="small" color={COLORS.white} />
                      <Text style={styles.scannedBadgeText}>Procesando código QR...</Text>
                    </View>
                  )}

                  {/* Manual token input option */}
                  <View style={styles.manualTokenBox}>
                    <Text style={styles.manualLabel}>¿Problemas con el reflejo? Ingresa el token:</Text>
                    <View style={styles.manualInputRow}>
                      <TextInput
                        style={styles.manualInput}
                        placeholder="Ej. CHECKU-EDA-..."
                        placeholderTextColor="#94A3B8"
                        value={manualToken}
                        onChangeText={setManualToken}
                        autoCapitalize="characters"
                      />
                      <TouchableOpacity
                        style={styles.manualSubmitBtn}
                        onPress={handleManualSubmit}
                      >
                        <Text style={styles.manualSubmitText}>Validar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        ) : (
          /* MODE 2: 3-DIGIT PIN KEYPAD */
          <ScrollView contentContainerStyle={styles.pinScrollContent} bounces={false}>
            <Text style={styles.pinInstructions}>
              Ingresa el código de 3 dígitos dictado o proyectado por tu profesor
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
          </ScrollView>
        )}
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
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
  activeBanner: {
    backgroundColor: 'rgba(99, 184, 159, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 184, 159, 0.4)',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
  },
  activeBannerTitle: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  activeBannerClass: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  cameraWrapper: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  cameraInstructions: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  scannerBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  laser: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: COLORS.green,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  scannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.green,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  scannedBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  manualTokenBox: {
    width: '100%',
    backgroundColor: 'rgba(23, 43, 77, 0.9)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(99, 184, 159, 0.3)',
  },
  manualLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.mint,
    marginBottom: 8,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    height: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  manualSubmitBtn: {
    backgroundColor: COLORS.green,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  permissionIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  permissionTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionText: {
    color: COLORS.white,
    marginTop: 14,
    fontSize: 13,
    fontWeight: '600',
  },
  grantPermissionBtn: {
    backgroundColor: COLORS.green,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  grantPermissionText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  fallbackPinBtn: {
    marginTop: 14,
    paddingVertical: 10,
  },
  fallbackPinText: {
    color: COLORS.mint,
    fontSize: 13,
    fontWeight: '700',
  },
  pinScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  pinInstructions: {
    color: COLORS.mint,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 18,
    maxWidth: 300,
    lineHeight: 18,
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
});

export default QRScannerModal;
