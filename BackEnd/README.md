# ⚙️ CheckU — API REST BackEnd (Flask & MySQL)

Servidor central de CheckU implementado en **Python Flask 3.0** con **SQLAlchemy**, **Flask-Migrate (Alembic)**, autenticación con tokens **JWT** y base de datos oficial en **MySQL** (`cuu` en XAMPP).

---

## 🚀 Inicio Rápido

### 1. Requisitos
- Python 3.10 a 3.12
- MySQL (XAMPP) en el puerto estándar 3306

### 2. Instalación de dependencias
```bash
# (Opcional) Activar entorno virtual
venv\Scripts\activate

# Instalar librerías
pip install -r requirements.txt
```

### 3. Variables de Entorno (`.env`)
Verifica tu archivo `.env`:
```env
FLASK_APP=app.py
FLASK_DEBUG=1
PORT=5000
SECRET_KEY=checku-super-secret-key-2024
JWT_SECRET_KEY=checku-jwt-secret-key-token-2024
JWT_EXPIRATION_HOURS=24
QR_EXPIRATION_MINUTES=10

MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=cuu
```

### 4. Inicializar y Sembrar la Base de Datos
Para cargar datos de demostración (admin, profesores, alumnos y grupos demo):
```bash
python seeds/seeder.py
```
O utiliza el asistente interactivo en la raíz: `..\migrar_bd.bat`

### 5. Iniciar el Servidor
```bash
python run.py
```
El servidor quedará disponible en `http://localhost:5000`.

---

## 📡 Módulos y Rutas Principales

- **Autenticación (`/api/auth`)**:
  - `POST /api/auth/login`: Login unificado para Administrador, Docente y Alumno (con redirección inteligente por rol).
  - `GET /api/auth/verify`: Validación del token JWT activo.
- **Motor QR (`/api/qr`)**:
  - `POST /api/qr/generar`: Genera token único con código QR Base64 y PIN de 3 dígitos para el aula.
  - `POST /api/qr/escanear`: Registra asistencia al escanear QR o ingresar PIN.
  - `GET /api/qr/sesion/<token_qr>/asistencias`: Feed en vivo de alumnos que van registrándose.
  - `POST /api/qr/cerrar/<token_qr>`: Concluye la sesión de asistencia activa.
- **Gestión Docente (`/api/profesor`)**:
  - CRUD de grupos, listas de asistencia, horarios y alumnos.
- **Administración (`/api/admin`)**:
  - CRUD de docentes y métricas universitarias.
- **Justificantes (`/api/justificantes`)**:
  - Envío, consulta y aprobación/rechazo de comprobantes médicos.
