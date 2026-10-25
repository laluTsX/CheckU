from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from extensions import db
from models.profesor import Profesor
from models.alumno import Alumno
from models.grupo import Grupo
from models.sesion_qr import SesionQR
from models.asistencia import Asistencia
from models.administrador import Administrador
from models.justificante import Justificante

profesor_bp = Blueprint('profesor_bp', __name__)

def get_current_actor():
    claims = get_jwt()
    role = claims.get('role')
    identity = get_jwt_identity()
    user_id = claims.get('id')

    if role == 'profesor':
        user = None
        if identity:
            user = Profesor.query.filter_by(matricula=identity).first()
        if not user and user_id:
            user = Profesor.query.get(user_id)
        return 'profesor', user
    elif role == 'admin':
        user = None
        if identity:
            user = Administrador.query.filter_by(usuario=identity).first()
        if not user and user_id:
            user = Administrador.query.get(user_id)
        return 'admin', user
    return None, None

def get_current_profesor():
    role, user = get_current_actor()
    return user if role == 'profesor' else None


@profesor_bp.route('/grupos', methods=['GET'])
@jwt_required()
def get_grupos():
    role, user = get_current_actor()
    if not user:
        return jsonify({'success': False, 'message': 'Acceso no autorizado para este recurso.'}), 403

    if role == 'admin':
        grupos = Grupo.query.order_by(Grupo.id.desc()).all()
    else:
        grupos = Grupo.query.filter_by(profesor_id=user.id).order_by(Grupo.id.desc()).all()

    resultado = []
    for g in grupos:
        g_dict = g.to_dict()
        total_alumnos = len(g.alumnos)
        total_sesiones = SesionQR.query.filter_by(grupo_id=g.id).count()
        
        # Calculate percentage of attendance (Presentes + Justificadas)
        if total_sesiones > 0 and total_alumnos > 0:
            total_asistencias = (
                Asistencia.query
                .join(SesionQR, Asistencia.sesion_id == SesionQR.id)
                .filter(SesionQR.grupo_id == g.id)
                .count()
            )
            asistencia_esperada = total_sesiones * total_alumnos
            porcentaje = round((total_asistencias / asistencia_esperada) * 100, 1)
        else:
            porcentaje = 0.0

        # Check if there is an active session right now
        sesion_activa = SesionQR.query.filter_by(grupo_id=g.id, activo=True).order_by(SesionQR.id.desc()).first()
        is_active = sesion_activa.is_valid if sesion_activa else False

        g_dict['porcentaje_asistencia'] = porcentaje
        g_dict['total_sesiones'] = total_sesiones
        g_dict['sesion_activa'] = is_active
        g_dict['sesion_activa_token'] = sesion_activa.token_qr if is_active else None
        g_dict['sesion_activa_codigo_pin'] = sesion_activa.codigo_pin if is_active else None
        resultado.append(g_dict)

    return jsonify({'success': True, 'grupos': resultado}), 200


@profesor_bp.route('/grupos', methods=['POST'])
@jwt_required()
def create_grupo():
    role, user = get_current_actor()
    if not user:
        return jsonify({'success': False, 'message': 'Acceso denegado.'}), 403

    data = request.get_json() or {}
    nombre_materia = data.get('nombre_materia', '').strip()
    codigo_grupo = data.get('codigo_grupo', '').strip()
    horario = data.get('horario', '').strip()
    aula = data.get('aula', '').strip() or 'Aula General'
    
    fecha_inicio_str = data.get('fecha_inicio', '').strip()
    fecha_fin_str = data.get('fecha_fin', '').strip()
    dias_semana = data.get('dias_semana', '').strip()
    hora_inicio = data.get('hora_inicio', '').strip()
    hora_fin = data.get('hora_fin', '').strip()

    if not nombre_materia or not codigo_grupo or not horario:
        return jsonify({
            'success': False,
            'message': 'Materia, código de grupo y horario son obligatorios.'
        }), 400

    profesor_id = user.id if role == 'profesor' else data.get('profesor_id')
    if not profesor_id and role == 'admin':
        first_prof = Profesor.query.first()
        profesor_id = first_prof.id if first_prof else 1

    fecha_inicio = None
    fecha_fin = None
    if fecha_inicio_str and fecha_fin_str:
        try:
            fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
            fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Formato de fecha inválido. Utiliza el formato YYYY-MM-DD.'
            }), 400

        if fecha_fin <= fecha_inicio:
            return jsonify({
                'success': False,
                'message': 'La fecha de finalización debe ser posterior a la fecha de inicio del cuatrimestre.'
            }), 400

        duracion_dias = (fecha_fin - fecha_inicio).days + 1
        # 4 months rule: Maximum 125 calendar days allowed for a cuatrimestre
        if duracion_dias > 125:
            return jsonify({
                'success': False,
                'message': f'La clase está destinada a durar un cuatrimestre (máximo 4 meses / 125 días). El lapso seleccionado de {duracion_dias} días excede este periodo.'
            }), 400

    nuevo_grupo = Grupo(
        nombre_materia=nombre_materia,
        codigo_grupo=codigo_grupo,
        profesor_id=profesor_id,
        aula=aula,
        horario=horario,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        dias_semana=dias_semana,
        hora_inicio=hora_inicio,
        hora_fin=hora_fin
    )
    db.session.add(nuevo_grupo)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Clase / Salón de cuatrimestre creado exitosamente.',
        'grupo': nuevo_grupo.to_dict()
    }), 201


@profesor_bp.route('/grupos/<int:grupo_id>', methods=['GET'])
@jwt_required()
def get_grupo_detalle(grupo_id):
    role, user = get_current_actor()
    if not user:
        return jsonify({'success': False, 'message': 'Acceso denegado.'}), 403

    if role == 'admin':
        grupo = Grupo.query.get(grupo_id)
    else:
        grupo = Grupo.query.filter_by(id=grupo_id, profesor_id=user.id).first()

    if not grupo:
        return jsonify({'success': False, 'message': 'Grupo no encontrado.'}), 404

    data = grupo.to_dict(include_alumnos=True)

    # Attach student individual attendance summary and absences in this group
    sesiones_totales = SesionQR.query.filter_by(grupo_id=grupo.id).count()
    planeadas_info = grupo.calcular_sesiones_planeadas()
    total_planeadas = planeadas_info['total_planeadas']

    alumnos_con_stats = []
    for al in grupo.alumnos:
        al_dict = al.to_dict()
        
        # Presenciales
        asistencias_presenciales = (
            Asistencia.query
            .join(SesionQR, Asistencia.sesion_id == SesionQR.id)
            .filter(SesionQR.grupo_id == grupo.id, Asistencia.alumno_id == al.id, Asistencia.estado == 'PRESENTE')
            .count()
        )
        # Justificadas
        faltas_justificadas = (
            Asistencia.query
            .join(SesionQR, Asistencia.sesion_id == SesionQR.id)
            .filter(SesionQR.grupo_id == grupo.id, Asistencia.alumno_id == al.id, Asistencia.estado == 'JUSTIFICADA')
            .count()
        )
        
        asistencias_efectivas = asistencias_presenciales + faltas_justificadas
        pct = round((asistencias_efectivas / sesiones_totales * 100), 1) if sesiones_totales > 0 else 100.0
        faltas_acumuladas = max(0, sesiones_totales - asistencias_efectivas)
        max_faltas = int(total_planeadas * 0.20) if total_planeadas > 0 else 6

        al_dict['asistencias_count'] = asistencias_presenciales
        al_dict['faltas_justificadas'] = faltas_justificadas
        al_dict['asistencias_totales'] = asistencias_efectivas
        al_dict['asistencias_porcentaje'] = pct
        al_dict['faltas_acumuladas'] = faltas_acumuladas
        al_dict['max_faltas_permitidas'] = max_faltas
        al_dict['en_riesgo'] = (faltas_acumuladas >= max_faltas) if sesiones_totales > 0 else False
        alumnos_con_stats.append(al_dict)

    data['alumnos'] = alumnos_con_stats
    data['total_sesiones'] = sesiones_totales
    data['total_sesiones_planeadas'] = total_planeadas
    data['sesiones_restantes'] = max(0, total_planeadas - sesiones_totales)
    data['max_faltas_permitidas'] = int(total_planeadas * 0.20) if total_planeadas > 0 else 6
    data['justificantes'] = [j.to_dict() for j in grupo.justificantes]

    # Check active session
    sesion_activa = SesionQR.query.filter_by(grupo_id=grupo.id, activo=True).order_by(SesionQR.id.desc()).first()
    data['sesion_activa'] = sesion_activa.to_dict(include_asistencias=True) if (sesion_activa and sesion_activa.is_valid) else None

    return jsonify({'success': True, 'grupo': data}), 200


@profesor_bp.route('/grupos/<int:grupo_id>', methods=['PUT'])
@jwt_required()
def update_grupo(grupo_id):
    role, user = get_current_actor()
    if not user:
        return jsonify({'success': False, 'message': 'Acceso denegado.'}), 403

    if role == 'admin':
        grupo = Grupo.query.get(grupo_id)
    else:
        grupo = Grupo.query.filter_by(id=grupo_id, profesor_id=user.id).first()

    if not grupo:
        return jsonify({'success': False, 'message': 'Grupo no encontrado o no tienes permisos para editarlo.'}), 404

    data = request.get_json() or {}
    if 'nombre_materia' in data:
        grupo.nombre_materia = data['nombre_materia'].strip()
    if 'codigo_grupo' in data:
        grupo.codigo_grupo = data['codigo_grupo'].strip()
    if 'aula' in data:
        grupo.aula = data['aula'].strip()
    if 'horario' in data:
        grupo.horario = data['horario'].strip()
    if 'dias_semana' in data:
        grupo.dias_semana = data['dias_semana'].strip()
    if 'hora_inicio' in data:
        grupo.hora_inicio = data['hora_inicio'].strip()
    if 'hora_fin' in data:
        grupo.hora_fin = data['hora_fin'].strip()

    if 'fecha_inicio' in data and 'fecha_fin' in data:
        f_ini_str = data['fecha_inicio']
        f_fin_str = data['fecha_fin']
        if f_ini_str and f_fin_str:
            try:
                f_ini = datetime.strptime(f_ini_str, '%Y-%m-%d').date()
                f_fin = datetime.strptime(f_fin_str, '%Y-%m-%d').date()
                if f_fin <= f_ini:
                    return jsonify({'success': False, 'message': 'La fecha de fin debe ser posterior a la de inicio.'}), 400
                duracion = (f_fin - f_ini).days + 1
                if duracion > 125:
                    return jsonify({'success': False, 'message': 'El cuatrimestre no puede durar más de 4 meses (máximo 125 días).'}), 400
                grupo.fecha_inicio = f_ini
                grupo.fecha_fin = f_fin
            except ValueError:
                return jsonify({'success': False, 'message': 'Formato de fecha inválido.'}), 400

    db.session.commit()
    return jsonify({'success': True, 'message': 'Clase / Salón actualizado con éxito.', 'grupo': grupo.to_dict()}), 200


@profesor_bp.route('/grupos/<int:grupo_id>', methods=['DELETE'])
@jwt_required()
def delete_grupo(grupo_id):
    role, user = get_current_actor()
    if not user:
        return jsonify({'success': False, 'message': 'Acceso denegado.'}), 403

    if role == 'admin':
        grupo = Grupo.query.get(grupo_id)
    else:
        grupo = Grupo.query.filter_by(id=grupo_id, profesor_id=user.id).first()

    if not grupo:
        return jsonify({'success': False, 'message': 'Grupo no encontrado o no autorizado.'}), 404

    nombre = grupo.nombre_materia
    db.session.delete(grupo)
    db.session.commit()
    return jsonify({'success': True, 'message': f'Clase "{nombre}" eliminada correctamente.'}), 200


@profesor_bp.route('/grupos/<int:grupo_id>/alumnos', methods=['POST'])
@jwt_required()
def add_alumno_to_grupo(grupo_id):
    role, user = get_current_actor()
    if not user:
        return jsonify({'success': False, 'message': 'Acceso denegado.'}), 403

    if role == 'admin':
        grupo = Grupo.query.get(grupo_id)
    else:
        grupo = Grupo.query.filter_by(id=grupo_id, profesor_id=user.id).first()

    if not grupo:
        return jsonify({'success': False, 'message': 'Grupo no encontrado o sin permisos.'}), 404

    data = request.get_json() or {}

    # Soporte para inscripción múltiple por IDs de alumno
    alumno_ids = data.get('alumno_ids')
    if isinstance(alumno_ids, list):
        if not alumno_ids:
            return jsonify({'success': False, 'message': 'No se enviaron IDs de alumnos para inscribir.'}), 400
        
        agregados = []
        omitidos = []
        ids_actuales = {a.id for a in grupo.alumnos}

        for a_id in alumno_ids:
            try:
                al_id_int = int(a_id)
            except (ValueError, TypeError):
                continue
            
            if al_id_int in ids_actuales:
                omitidos.append(al_id_int)
                continue

            alumno = Alumno.query.get(al_id_int)
            if alumno:
                grupo.alumnos.append(alumno)
                ids_actuales.add(alumno.id)
                agregados.append(alumno.to_dict())

        db.session.commit()
        return jsonify({
            'success': True,
            'message': f'{len(agregados)} alumno(s) inscritos exitosamente al salón.' + (f' ({len(omitidos)} ya estaban en la lista).' if omitidos else ''),
            'agregados_count': len(agregados),
            'omitidos_count': len(omitidos)
        }), 200

    # Soporte para inscripción múltiple por lista de matrículas
    matriculas_list = data.get('matriculas')
    if isinstance(matriculas_list, list):
        if not matriculas_list:
            return jsonify({'success': False, 'message': 'No se enviaron matrículas para inscribir.'}), 400
        
        agregados = []
        omitidos = []
        matriculas_actuales = {a.matricula.upper() for a in grupo.alumnos}

        for mat in matriculas_list:
            mat_clean = str(mat).strip().upper()
            if not mat_clean:
                continue
            if mat_clean in matriculas_actuales:
                omitidos.append(mat_clean)
                continue

            alumno = Alumno.query.filter_by(matricula=mat_clean).first()
            if alumno:
                grupo.alumnos.append(alumno)
                matriculas_actuales.add(alumno.matricula.upper())
                agregados.append(alumno.to_dict())

        db.session.commit()
        return jsonify({
            'success': True,
            'message': f'{len(agregados)} alumno(s) inscritos exitosamente al salón.',
            'agregados_count': len(agregados),
            'omitidos_count': len(omitidos)
        }), 200

    # Inscripción individual manual tradicional
    matricula = data.get('matricula', '').strip().upper()
    nombre = data.get('nombre', '').strip()
    carrera = data.get('carrera', '').strip()
    email = data.get('email', '').strip()

    if not matricula:
        return jsonify({'success': False, 'message': 'La matrícula es requerida.'}), 400

    alumno = Alumno.query.filter_by(matricula=matricula).first()
    if not alumno:
        if not nombre:
            return jsonify({
                'success': False,
                'message': 'El alumno no existe aún en el directorio. Proporciona su nombre completo para darlo de alta.'
            }), 400

        alumno = Alumno(
            matricula=matricula,
            nombre=nombre,
            carrera=carrera or 'Ingeniería',
            email=email or f'{matricula.lower()}@checku.edu'
        )
        db.session.add(alumno)
        db.session.flush()

    if alumno in grupo.alumnos:
        return jsonify({
            'success': False,
            'message': f'El alumno con matrícula {matricula} ya está inscrito en este grupo.'
        }), 409

    grupo.alumnos.append(alumno)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Alumno {alumno.nombre} ({alumno.matricula}) asignado al grupo con éxito.',
        'alumno': alumno.to_dict()
    }), 201


@profesor_bp.route('/grupos/<int:grupo_id>/alumnos/<int:alumno_id>', methods=['DELETE'])
@jwt_required()
def remove_alumno_from_grupo(grupo_id, alumno_id):
    role, user = get_current_actor()
    if not user:
        return jsonify({'success': False, 'message': 'Acceso denegado.'}), 403

    if role == 'admin':
        grupo = Grupo.query.get(grupo_id)
    else:
        grupo = Grupo.query.filter_by(id=grupo_id, profesor_id=user.id).first()

    if not grupo:
        return jsonify({'success': False, 'message': 'Grupo no encontrado o sin permisos.'}), 404

    alumno = Alumno.query.get(alumno_id)
    if not alumno or alumno not in grupo.alumnos:
        return jsonify({'success': False, 'message': 'El alumno no está inscrito en este grupo.'}), 404

    grupo.alumnos.remove(alumno)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Alumno {alumno.nombre} desvinculado del grupo.'
    }), 200


@profesor_bp.route('/alumnos', methods=['GET'])
@jwt_required()
def get_todos_alumnos():
    role, user = get_current_actor()
    if not user:
        return jsonify({'success': False, 'message': 'Acceso denegado.'}), 403

    alumnos = Alumno.query.order_by(Alumno.nombre.asc()).all()
    return jsonify({
        'success': True,
        'alumnos': [a.to_dict() for a in alumnos]
    }), 200


@profesor_bp.route('/alumnos', methods=['POST'])
@jwt_required()
def create_alumno():
    role, user = get_current_actor()
    if not user:
        return jsonify({'success': False, 'message': 'Acceso denegado.'}), 403

    data = request.get_json() or {}
    matricula = data.get('matricula', '').strip().upper()
    nombre = data.get('nombre', '').strip()
    carrera = data.get('carrera', '').strip()
    email = data.get('email', '').strip()

    if not matricula or not nombre:
        return jsonify({'success': False, 'message': 'Matrícula y nombre son requeridos.'}), 400

    existente = Alumno.query.filter_by(matricula=matricula).first()
    if existente:
        return jsonify({'success': False, 'message': 'Ya existe un alumno registrado con esta matrícula.'}), 409

    nuevo_alumno = Alumno(
        matricula=matricula,
        nombre=nombre,
        carrera=carrera or 'Ingeniería',
        email=email or f"{matricula.lower()}@checku.edu"
    )
    db.session.add(nuevo_alumno)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Alumno registrado exitosamente.',
        'alumno': nuevo_alumno.to_dict()
    }), 201


@profesor_bp.route('/alumnos/<int:alumno_id>', methods=['PUT'])
@jwt_required()
def update_alumno(alumno_id):
    role, user = get_current_actor()
    if not user:
        return jsonify({'success': False, 'message': 'Acceso denegado.'}), 403

    alumno = Alumno.query.get(alumno_id)
    if not alumno:
        return jsonify({'success': False, 'message': 'Alumno no encontrado.'}), 404

    data = request.get_json() or {}
    matricula = data.get('matricula', '').strip().upper()
    nombre = data.get('nombre', '').strip()
    carrera = data.get('carrera', '').strip()
    email = data.get('email', '').strip()

    if matricula and matricula != alumno.matricula:
        existente = Alumno.query.filter_by(matricula=matricula).first()
        if existente:
            return jsonify({'success': False, 'message': f'La matrícula "{matricula}" ya está registrada con otro alumno.'}), 409
        alumno.matricula = matricula

    if nombre:
        alumno.nombre = nombre
    if carrera:
        alumno.carrera = carrera
    if email:
        if email != alumno.email:
            existente_email = Alumno.query.filter_by(email=email).first()
            if existente_email:
                return jsonify({'success': False, 'message': f'El correo "{email}" ya está registrado con otro alumno.'}), 409
        alumno.email = email

    db.session.commit()
    return jsonify({
        'success': True,
        'message': f'Datos del alumno "{alumno.nombre}" actualizados correctamente.',
        'alumno': alumno.to_dict()
    }), 200


@profesor_bp.route('/alumnos/<int:alumno_id>', methods=['DELETE'])
@jwt_required()
def delete_alumno(alumno_id):
    role, user = get_current_actor()
    if not user:
        return jsonify({'success': False, 'message': 'Acceso denegado.'}), 403

    alumno = Alumno.query.get(alumno_id)
    if not alumno:
        return jsonify({'success': False, 'message': 'Alumno no encontrado.'}), 404

    nombre = alumno.nombre
    matricula = alumno.matricula

    db.session.delete(alumno)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Alumno "{nombre}" ({matricula}) eliminado del sistema.'
    }), 200


@profesor_bp.route('/metricas', methods=['GET'])
@jwt_required()
def get_metricas():
    profesor = get_current_profesor()
    if not profesor:
        return jsonify({'success': False, 'message': 'Acceso denegado.'}), 403

    grupos = Grupo.query.filter_by(profesor_id=profesor.id).all()
    grupo_ids = [g.id for g in grupos]

    total_grupos = len(grupos)
    alumnos_unicos = set()
    for g in grupos:
        for al in g.alumnos:
            alumnos_unicos.add(al.id)
    total_alumnos = len(alumnos_unicos)

    total_sesiones = SesionQR.query.filter(SesionQR.grupo_id.in_(grupo_ids)).count() if grupo_ids else 0

    total_asistencias = 0
    asistencia_esperada_global = 0
    if grupo_ids:
        total_asistencias = (
            Asistencia.query
            .join(SesionQR, Asistencia.sesion_id == SesionQR.id)
            .filter(SesionQR.grupo_id.in_(grupo_ids))
            .count()
        )
        for g in grupos:
            sesiones_g = SesionQR.query.filter_by(grupo_id=g.id).count()
            asistencia_esperada_global += (sesiones_g * len(g.alumnos))

    porcentaje_global = round((total_asistencias / asistencia_esperada_global * 100), 1) if asistencia_esperada_global > 0 else 0

    sesiones_activas = [
        s.to_dict(include_asistencias=True)
        for s in SesionQR.query.filter(SesionQR.grupo_id.in_(grupo_ids), SesionQR.activo == True).all()
        if s.is_valid
    ] if grupo_ids else []

    total_justificantes = Justificante.query.filter(Justificante.grupo_id.in_(grupo_ids)).count() if grupo_ids else 0

    return jsonify({
        'success': True,
        'metricas': {
            'total_grupos': total_grupos,
            'total_alumnos': total_alumnos,
            'total_sesiones': total_sesiones,
            'total_asistencias': total_asistencias,
            'total_justificantes': total_justificantes,
            'porcentaje_asistencia_promedio': porcentaje_global,
            'sesiones_activas_count': len(sesiones_activas),
            'sesiones_activas': sesiones_activas
        }
    }), 200


@profesor_bp.route('/reportes', methods=['GET'])
@jwt_required()
def get_reportes():
    profesor = get_current_profesor()
    if not profesor:
        return jsonify({'success': False, 'message': 'Acceso denegado.'}), 403

    grupo_id = request.args.get('grupo_id', type=int)
    grupos_query = Grupo.query.filter_by(profesor_id=profesor.id)
    if grupo_id:
        grupos_query = grupos_query.filter_by(id=grupo_id)
    grupos = grupos_query.all()
    grupo_ids = [g.id for g in grupos]

    sesiones = SesionQR.query.filter(SesionQR.grupo_id.in_(grupo_ids)).order_by(SesionQR.fecha_creacion.desc()).all() if grupo_ids else []
    
    reporte = []
    for s in sesiones:
        s_data = s.to_dict(include_asistencias=True)
        total_inscritos = len(s.grupo.alumnos) if s.grupo else 0
        asistentes_count = len([a for a in s.asistencias if a.estado in ('PRESENTE', 'JUSTIFICADA')])
        s_data['total_inscritos'] = total_inscritos
        s_data['porcentaje_asistencia'] = round((asistentes_count / total_inscritos * 100), 1) if total_inscritos > 0 else 0
        reporte.append(s_data)

    return jsonify({
        'success': True,
        'reportes': reporte
    }), 200


@profesor_bp.route('/grupos/<int:grupo_id>/exportar-csv', methods=['GET'])
@jwt_required()
def exportar_grupo_csv(grupo_id):
    """Export attendance report for a specific class/grupo as CSV with cuatrimestre metrics"""
    import csv
    import io
    from flask import Response

    profesor = get_current_profesor()
    if not profesor:
        return jsonify({'success': False, 'message': 'Acceso denegado.'}), 403

    grupo = Grupo.query.filter_by(id=grupo_id, profesor_id=profesor.id).first()
    if not grupo:
        return jsonify({'success': False, 'message': 'Grupo no encontrado o no autorizado.'}), 404

    sesiones_totales = SesionQR.query.filter_by(grupo_id=grupo.id).count()
    planeadas_info = grupo.calcular_sesiones_planeadas()

    output = io.StringIO()
    output.write('\ufeff')  # UTF-8 BOM for Excel compatibility
    writer = csv.writer(output)

    # Class Header Metadata
    writer.writerow(['REPORTE OFICIAL DE ASISTENCIAS CUATRIMESTRAL - CHECKU'])
    writer.writerow(['Asignatura:', grupo.nombre_materia])
    writer.writerow(['Código de Grupo:', grupo.codigo_grupo])
    writer.writerow(['Aula:', grupo.aula])
    writer.writerow(['Horario:', grupo.horario])
    writer.writerow(['Periodo del Cuatrimestre:', f"{grupo.fecha_inicio or 'N/D'} a {grupo.fecha_fin or 'N/D'}"])
    writer.writerow(['Profesor(a):', profesor.nombre])
    writer.writerow(['Total de Alumnos:', len(grupo.alumnos)])
    writer.writerow(['Sesiones Planeadas del Cuatrimestre:', planeadas_info['total_planeadas']])
    writer.writerow(['Sesiones Impartidas a la Fecha:', sesiones_totales])
    writer.writerow([])

    # Table Header
    writer.writerow([
        '#',
        'Matrícula',
        'Nombre Completo',
        'Carrera',
        'Asistencias Presenciales',
        'Faltas Justificadas',
        'Total Asistencias Efectivas',
        'Faltas Acumuladas',
        'Máx Faltas Permitidas',
        'Porcentaje (%)',
        'Estatus'
    ])

    max_faltas = int(planeadas_info['total_planeadas'] * 0.20) if planeadas_info['total_planeadas'] > 0 else 6

    for idx, al in enumerate(grupo.alumnos, 1):
        asist_pres = (
            Asistencia.query
            .join(SesionQR, Asistencia.sesion_id == SesionQR.id)
            .filter(SesionQR.grupo_id == grupo.id, Asistencia.alumno_id == al.id, Asistencia.estado == 'PRESENTE')
            .count()
        )
        asist_just = (
            Asistencia.query
            .join(SesionQR, Asistencia.sesion_id == SesionQR.id)
            .filter(SesionQR.grupo_id == grupo.id, Asistencia.alumno_id == al.id, Asistencia.estado == 'JUSTIFICADA')
            .count()
        )
        asist_tot = asist_pres + asist_just
        pct = round((asist_tot / sesiones_totales * 100), 1) if sesiones_totales > 0 else 100.0
        faltas = max(0, sesiones_totales - asist_tot)
        estatus = 'REGULAR (>=80%)' if pct >= 80 else 'EN RIESGO DE REPROBACIÓN'
        
        writer.writerow([
            idx,
            al.matricula,
            al.nombre,
            al.carrera or 'N/A',
            asist_pres,
            asist_just,
            asist_tot,
            faltas,
            max_faltas,
            f"{pct}%",
            estatus
        ])

    csv_data = output.getvalue()
    filename = f"CheckU_{grupo.codigo_grupo}_Cuatrimestre_Reporte.csv"
    return Response(
        csv_data,
        mimetype="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/csv; charset=utf-8"
        }
    )
