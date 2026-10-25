# 🌐 CheckU — Frontend Web (Portal Docente y Administrativo)

Portal web universitario desarrollado con **Next.js 14**, **React 18**, **TypeScript** y **Tailwind CSS**. Permite a los profesores proyectar la sesión de asistencia en clase con códigos QR dinámicos y a los administradores gestionar la plantilla docente y métricas institucionales.

---

## 🚀 Inicio Rápido

### 1. Requisitos
- Node.js `18.x` o superior
- Servidor BackEnd corriendo en `http://localhost:5000`

### 2. Instalación de dependencias
```bash
npm install
```

### 3. Configuración de Variables de Entorno (`.env.local`)
Por defecto el cliente Axios se conecta a `http://localhost:5000/api`. Si deseas personalizar la URL de la API:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. Modo Desarrollo
```bash
npm run dev
```
Abre tu navegador en [http://localhost:3000](http://localhost:3000).

O ejecuta desde la raíz del proyecto el archivo:
```cmd
iniciar_web.bat
```

---

## 📂 Estructura de Páginas (`src/pages`)

| Ruta | Descripción | Rol de Acceso |
|---|---|---|
| `/login` | Inicio de sesión unificado con detección de rol | Docentes y Administradores |
| `/dashboard` | Resumen de grupos activos y métricas de asistencia | Profesor |
| `/grupos` | Listado y creación de materias y cuatrimestres | Profesor |
| `/grupos/[id]` | Gestión de grupo, lista de alumnos, justificantes y exportación | Profesor |
| `/proyector/[id]` | **Modo Proyector**: QR gigante, PIN de 3 dígitos, cuenta regresiva y feed en vivo | Profesor |
| `/admin` | Panel de gestión de docentes y estadísticas globales | Administrador |
| `/reportes` | Descarga de reportes analíticos | Docente / Admin |

---

## 📦 Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo en el puerto 3000.
- `npm run build`: Compila la aplicación para producción.
- `npm run start`: Inicia el servidor en producción compilada.
- `npm run lint`: Ejecuta las validaciones de ESLint.
