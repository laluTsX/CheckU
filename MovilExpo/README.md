# 📱 CheckU — App Móvil Estudiantil (Expo Go)

Aplicación móvil desarrollada con **React Native** y **Expo SDK** para que los alumnos de CheckU registren su asistencia en tiempo real mediante la cámara de su teléfono o a través del PIN de 3 dígitos visible en el aula.

---

## 🚀 Inicio Rápido con Expo Go

### 1. Requisitos
- Node.js `18.x` o superior.
- La aplicación gratuita **Expo Go** instalada en tu teléfono celular (disponible en Google Play Store y App Store).
- La PC y el teléfono deben estar conectados a la **misma red Wi-Fi**.

### 2. Instalación de dependencias
```bash
npm install
```

### 3. Iniciar el servidor Metro
```bash
npx expo start -c
```
*O haz doble clic en `..\iniciar_movil_expo.bat` desde la raíz.*

### 4. Abrir la App en el teléfono
1. Verás un **código QR en la terminal**.
2. Abre la app **Expo Go** en tu celular:
   - En **Android**: selecciona *"Scan QR code"* y enfoca la terminal.
   - En **iOS**: abre la app nativa de Cámara y pulsa sobre la notificación emergente de Expo.

---

## 💡 Funcionalidades Principales

- **Acceso Estudiantil**: Inicio de sesión ingresando la matrícula (ej. `A01700101`).
- **Escáner QR**: Detección veloz del código QR proyectado por el docente usando `expo-camera`.
- **PIN de 3 Dígitos**: Entrada numérica de respaldo para salones con poca visibilidad o problemas de enfoque de cámara.
- **Historial de Asistencias**: Visualización detallada por materia, porcentajes acumulados y faltas.
- **Envío de Justificantes**: Carga de comprobantes médicos o permisos para su revisión por parte del docente.
- **Configuración de IP de Servidor**: Detección automática del host y opción manual para ajustar la IP del BackEnd en la pantalla de inicio.
