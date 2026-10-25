import os
import sys
from datetime import datetime, timedelta

# Ensure BackEnd root is on Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from extensions import db
from models.profesor import Profesor
from models.alumno import Alumno
from models.grupo import Grupo
from models.sesion_qr import SesionQR
from models.asistencia import Asistencia
from models.administrador import Administrador

def seed_database():
    print("[CheckU] Iniciando la siembra de datos de prueba para CheckU...")

    # 0. Crear Administrador Demo
    admin = Administrador.query.filter_by(usuario='admin').first()
    if not admin:
        admin = Administrador(
            usuario='admin',
            nombre='Administrador General CheckU',
            email='admin@checku.edu'
        )
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.flush()
        print("  [OK] Administrador creado: Usuario 'admin', Pass: 'admin123'")
    else:
        print("  [INFO] Administrador 'admin' ya existía.")

    # 1. Crear Profesor Demo
    profesor = Profesor.query.filter_by(matricula='DOC-202401').first()
    if not profesor:
        profesor = Profesor(
            matricula='DOC-202401',
            nombre='Dr. Carlos Mendoza',
            email='carlos.mendoza@checku.edu'
        )
        profesor.set_password('Password123!')
        db.session.add(profesor)
        db.session.flush()
        print("  [OK] Profesor creado: Dr. Carlos Mendoza (Matricula: DOC-202401, Pass: Password123!)")
    else:
        print("  [INFO] Profesor DOC-202401 ya existia.")

    # 2. Crear 5 Alumnos Demo
    alumnos_data = [
        {'matricula': 'A01700101', 'nombre': 'Sofia Valenzuela Morales', 'carrera': 'Ingenieria en Software', 'email': 'a01700101@checku.edu'},
        {'matricula': 'A01700102', 'nombre': 'Mateo Hernandez Silva', 'carrera': 'Ciencias de la Computacion', 'email': 'a01700102@checku.edu'},
        {'matricula': 'A01700103', 'nombre': 'Valentina Gomez Navarro', 'carrera': 'Ing. en Tecnologias de Informacion', 'email': 'a01700103@checku.edu'},
        {'matricula': 'A01700104', 'nombre': 'Diego Ramirez Torres', 'carrera': 'Ingenieria en Inteligencia Artificial', 'email': 'a01700104@checku.edu'},
        {'matricula': 'A01700105', 'nombre': 'Camila Morales Castillo', 'carrera': 'Ingenieria en Software', 'email': 'a01700105@checku.edu'},
    ]

    alumnos_instancias = []
    for item in alumnos_data:
        alumno = Alumno.query.filter_by(matricula=item['matricula']).first()
        if not alumno:
            alumno = Alumno(
                matricula=item['matricula'],
                nombre=item['nombre'],
                carrera=item['carrera'],
                email=item['email']
            )
            db.session.add(alumno)
            db.session.flush()
            print(f"  [OK] Alumno registrado: {alumno.nombre} ({alumno.matricula})")
        alumnos_instancias.append(alumno)

    # 3. Crear Salón / Grupo Demo
    grupo_principal = Grupo.query.filter_by(codigo_grupo='EDA-401').first()
    if not grupo_principal:
        grupo_principal = Grupo(
            nombre_materia='Estructura de Datos y Algoritmos',
            codigo_grupo='EDA-401',
            profesor_id=profesor.id,
            aula='Lab Alfa-2',
            horario='Lunes y Miercoles 08:00 - 10:00'
        )
        db.session.add(grupo_principal)
        db.session.flush()
        print(f"  [OK] Grupo 1 creado: {grupo_principal.nombre_materia} ({grupo_principal.codigo_grupo})")
    
    # Asignar los 5 alumnos al grupo principal
    for al in alumnos_instancias:
        if al not in grupo_principal.alumnos:
            grupo_principal.alumnos.append(al)

    # Segundo grupo para enriquecer la experiencia de usuario
    grupo_secundario = Grupo.query.filter_by(codigo_grupo='DWFS-502').first()
    if not grupo_secundario:
        grupo_secundario = Grupo(
            nombre_materia='Desarrollo Web Full-Stack',
            codigo_grupo='DWFS-502',
            profesor_id=profesor.id,
            aula='Aula Magna 3',
            horario='Martes y Jueves 10:00 - 12:00'
        )
        db.session.add(grupo_secundario)
        db.session.flush()
        print(f"  [OK] Grupo 2 creado: {grupo_secundario.nombre_materia} ({grupo_secundario.codigo_grupo})")

    for al in alumnos_instancias[:4]:
        if al not in grupo_secundario.alumnos:
            grupo_secundario.alumnos.append(al)

    db.session.commit()

    # 4. Crear sesiones pasadas de asistencia para mostrar métricas reales
    sesion_antigua = SesionQR.query.filter_by(token_qr='CHECKU-EDA-HISTORICA-1').first()
    if not sesion_antigua:
        hace_tres_dias = datetime.utcnow() - timedelta(days=3)
        sesion_antigua = SesionQR(
            grupo_id=grupo_principal.id,
            token_qr='CHECKU-EDA-HISTORICA-1',
            fecha_creacion=hace_tres_dias,
            fecha_expiracion=hace_tres_dias + timedelta(minutes=15),
            activo=False
        )
        db.session.add(sesion_antigua)
        db.session.flush()

        # Asistencia para 4 de 5 alumnos en la sesión pasada (80%)
        for al in alumnos_instancias[:4]:
            asist = Asistencia(
                sesion_id=sesion_antigua.id,
                alumno_id=al.id,
                fecha_registro=hace_tres_dias + timedelta(minutes=2),
                estado='PRESENTE'
            )
            db.session.add(asist)

        print("  [OK] Sesion historica de prueba generada con 80% de asistencia.")

    # 5. Crear una sesión QR activa de demostración
    sesion_activa = SesionQR.query.filter_by(token_qr='CHECKU-EDA-DEMO-ACTIVA').first()
    if not sesion_activa:
        ahora = datetime.utcnow()
        sesion_activa = SesionQR(
            grupo_id=grupo_principal.id,
            token_qr='CHECKU-EDA-DEMO-ACTIVA',
            fecha_creacion=ahora,
            fecha_expiracion=ahora + timedelta(minutes=60),
            activo=True
        )
        db.session.add(sesion_activa)
        db.session.flush()

        # 1 alumno ya registrado para mostrar la tabla viva
        asist_demo = Asistencia(
            sesion_id=sesion_activa.id,
            alumno_id=alumnos_instancias[0].id,
            fecha_registro=ahora,
            estado='PRESENTE'
        )
        db.session.add(asist_demo)
        print("  [OK] Sesion QR activa lista para pruebas en tiempo real.")

    db.session.commit()
    print("[CheckU] Base de datos sembrada exitosamente.")

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
        seed_database()
