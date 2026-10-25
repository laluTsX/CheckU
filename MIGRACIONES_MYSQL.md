# Guía de Migraciones de Base de Datos CheckU (MySQL `cuu`)

Esta guía explica cómo mantener sincronizada tu base de datos de MySQL (`cuu`) cada vez que agregues nuevos modelos o modifiques campos en la carpeta `BackEnd/models/`.

---

## 1. Método Rápido (Recomendado)

En la raíz del proyecto (`D:\CheckU\`), haz doble clic en el archivo:
```cmd
migrar_bd.bat
```
Este script te mostrará un menú interactivo con las opciones:
- **[1] Generar migración tras cambiar modelos:** detecta automáticamente los cambios en tus modelos Python y genera el script de migración (`flask db migrate`).
- **[2] Aplicar cambios a MySQL `cuu`:** ejecuta las modificaciones y crea las tablas o columnas en MySQL (`flask db upgrade`).
- **[3] Proceso completo:** Genera y aplica en un solo paso.
- **[4] Sembrar datos demo:** Carga datos iniciales (`admin`, docentes, alumnos de prueba).
- **[5] Comprobar conexión:** Muestra las tablas activas en `cuu`.

---

## 2. Método por Consola de Comandos (Terminal)

Abre una terminal en la carpeta `D:\CheckU\BackEnd`:

### A) Generar una migración tras modificar un modelo
Cuando agregues un nuevo campo a una clase en `models/` (por ejemplo un campo nuevo en `Grupo` o `Alumno`), ejecuta:
```bash
flask db migrate -m "nombre_descriptivo_del_cambio"
```
*(O también usando el alias corto: `flask migrate -m "nombre_descriptivo_del_cambio"`)*

### B) Aplicar los cambios a MySQL `cuu`
Para que los cambios impacten en las tablas de MySQL en XAMPP:
```bash
flask db upgrade
```
*(O también usando el alias corto: `flask upgrade`)*

### C) Si alguna vez necesitas inicializar desde cero el repositorio de migraciones:
```bash
flask db init
```
*(O `flask init`)*

---

## 3. Estructura de Tablas Actual en MySQL `cuu`

Actualmente la base de datos `cuu` contiene todas las tablas sincronizadas:

1. **`administradores`**: Cuentas con rol de administrador (`admin`).
2. **`profesores`**: Plantilla docente con matrícula y contraseña.
3. **`alumnos`**: Registro de estudiantes de la universidad.
4. **`grupos`**: Salones/clases con información del cuatrimestre:
   - `fecha_inicio` (DATE)
   - `fecha_fin` (DATE, máximo 4 meses)
   - `dias_semana` (VARCHAR)
   - `hora_inicio` y `hora_fin` (VARCHAR)
5. **`grupo_alumno`**: Relación de alumnos inscritos en cada grupo.
6. **`sesiones_qr`**: Sesiones de pase de lista con código QR dinámico y PIN por clase.
7. **`asistencias`**: Registro de pases de lista (`PRESENTE`, `RETARDO`, `FALTA`, `JUSTIFICADA`).
8. **`justificantes`**: Comprobantes de falta (PDF / imágenes) para recuperar asistencias.
9. **`alembic_version`**: Control de versión de migraciones aplicadas.
