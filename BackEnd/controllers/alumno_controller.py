from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models.alumno import Alumno
from models.grupo import Grupo
from models.sesion_qr import SesionQR
from models.asistencia import Asistencia

alumno_bp = Blueprint('alumno_bp', __name__)

def get_current_alumno():
    # Can be extracted from JWT or from query param / body
    identity = get_jwt_identity()
    claims = get_jwt()
    if claims.get('role') != 'alumno':
        return None
    return Alumno.query.filter_by(matricula=identity).first()


@alumno_bp.route('/horario', methods=['GET'])
@jwt_required()
def get_horario():
    alumno = get_current_alumno()
    if not alumno:
        return jsonify({'success': False, 'message': 'Acceso no autorizado para alumnos.'}), 403

    horario_list = []
    for g in alumno.grupos:
        # Check if there is an active QR session for this class right now
        sesion_activa = SesionQR.query.filter_by(grupo_id=g.id, activo=True).order_by(SesionQR.id.desc()).first()
        is_active = sesion_activa.is_valid if sesion_activa else False

        horario_list.append({
            'grupo_id': g.id,
            'nombre_materia': g.nombre_materia,
            'codigo_grupo': g.codigo_grupo,
            'aula': g.aula,
            'horario': g.horario,
            'profesor_nombre': g.profesor.nombre if g.profesor else 'Sin asignar',
            'sesion_activa': is_active
        })

    return jsonify({
        'success': True,
        'alumno': alumno.to_dict(),
        'horario': horario_list
    }), 200


@alumno_bp.route('/asistencias', methods=['GET'])
@jwt_required()
def get_asistencias():
    alumno = get_current_alumno()
    if not alumno:
        return jsonify({'success': False, 'message': 'Acceso no autorizado.'}), 403

    # All attendance records for this student
    registros = (
        Asistencia.query
        .filter_by(alumno_id=alumno.id)
        .order_by(Asistencia.fecha_registro.desc())
        .all()
    )

    asistencias_data = []
    for reg in registros:
        sesion = reg.sesion
        grupo = sesion.grupo if sesion else None
        asistencias_data.append({
            'id': reg.id,
            'sesion_id': reg.sesion_id,
            'fecha_registro': reg.fecha_registro.isoformat(),
            'hora': reg.fecha_registro.strftime('%H:%M:%S'),
            'fecha': reg.fecha_registro.strftime('%Y-%m-%d'),
            'estado': reg.estado,
            'materia': grupo.nombre_materia if grupo else 'N/A',
            'codigo_grupo': grupo.codigo_grupo if grupo else 'N/A',
            'aula': grupo.aula if grupo else 'N/A',
            'profesor': grupo.profesor.nombre if (grupo and grupo.profesor) else 'N/A'
        })

    # Summary per subject
    resumen_materias = []
    for g in alumno.grupos:
        sesiones_totales = SesionQR.query.filter_by(grupo_id=g.id).count()
        asistencias_materia = (
            Asistencia.query
            .join(SesionQR, Asistencia.sesion_id == SesionQR.id)
            .filter(SesionQR.grupo_id == g.id, Asistencia.alumno_id == alumno.id)
            .count()
        )
        pct = round((asistencias_materia / sesiones_totales * 100), 1) if sesiones_totales > 0 else 0
        resumen_materias.append({
            'grupo_id': g.id,
            'nombre_materia': g.nombre_materia,
            'codigo_grupo': g.codigo_grupo,
            'sesiones_totales': sesiones_totales,
            'asistencias_registradas': asistencias_materia,
            'porcentaje_asistencia': pct
        })

    return jsonify({
        'success': True,
        'resumen_materias': resumen_materias,
        'historial_asistencias': asistencias_data
    }), 200


@alumno_bp.route('/perfil', methods=['GET'])
@jwt_required()
def get_perfil():
    alumno = get_current_alumno()
    if not alumno:
        return jsonify({'success': False, 'message': 'Acceso no autorizado.'}), 403

    return jsonify({
        'success': True,
        'alumno': alumno.to_dict(),
        'total_materias': len(alumno.grupos)
    }), 200
