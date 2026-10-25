from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from extensions import db
from models.administrador import Administrador
from models.profesor import Profesor
from models.grupo import Grupo
from models.alumno import Alumno
from models.sesion_qr import SesionQR
from models.asistencia import Asistencia

admin_bp = Blueprint('admin_bp', __name__)

def get_current_admin():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return None
    identity = get_jwt_identity()
    return Administrador.query.filter_by(usuario=identity).first()


@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_admin_stats():
    admin = get_current_admin()
    if not admin:
        return jsonify({'success': False, 'message': 'Acceso restringido únicamente para administradores.'}), 403

    total_profesores = Profesor.query.count()
    total_grupos = Grupo.query.count()
    total_alumnos = Alumno.query.count()
    total_sesiones = SesionQR.query.count()
    total_asistencias = Asistencia.query.count()

    return jsonify({
        'success': True,
        'stats': {
            'total_profesores': total_profesores,
            'total_grupos': total_grupos,
            'total_alumnos': total_alumnos,
            'total_sesiones': total_sesiones,
            'total_asistencias': total_asistencias,
        }
    }), 200


@admin_bp.route('/profesores', methods=['GET'])
@jwt_required()
def get_profesores():
    admin = get_current_admin()
    if not admin:
        return jsonify({'success': False, 'message': 'Acceso restringido únicamente para administradores.'}), 403

    profesores = Profesor.query.order_by(Profesor.id.desc()).all()
    resultado = []

    for p in profesores:
        p_dict = p.to_dict()
        grupos = Grupo.query.filter_by(profesor_id=p.id).all()
        p_dict['total_grupos'] = len(grupos)
        
        # Calculate total unique students in his groups
        alumnos_ids = set()
        for g in grupos:
            for a in g.alumnos:
                alumnos_ids.add(a.id)
        p_dict['total_alumnos'] = len(alumnos_ids)
        p_dict['grupos_lista'] = [
            {'id': g.id, 'nombre_materia': g.nombre_materia, 'codigo_grupo': g.codigo_grupo, 'aula': g.aula}
            for g in grupos
        ]
        resultado.append(p_dict)

    return jsonify({'success': True, 'profesores': resultado}), 200


@admin_bp.route('/profesores', methods=['POST'])
@jwt_required()
def create_profesor():
    admin = get_current_admin()
    if not admin:
        return jsonify({'success': False, 'message': 'Acceso restringido únicamente para administradores.'}), 403

    data = request.get_json() or {}
    matricula = data.get('matricula', '').strip()
    nombre = data.get('nombre', '').strip()
    email = data.get('email', '').strip() or None
    password = data.get('password', '').strip()

    if not matricula or not nombre or not password:
        return jsonify({
            'success': False,
            'message': 'Matrícula, nombre completo y contraseña son obligatorios para dar de alta al docente.'
        }), 400

    # Validate uniqueness
    if Profesor.query.filter_by(matricula=matricula).first():
        return jsonify({
            'success': False,
            'message': f'Ya existe un profesor registrado con la matrícula o nómina "{matricula}".'
        }), 409

    if email and Profesor.query.filter_by(email=email).first():
        return jsonify({
            'success': False,
            'message': f'Ya existe un profesor registrado con el correo "{email}".'
        }), 409

    nuevo_profesor = Profesor(
        matricula=matricula,
        nombre=nombre,
        email=email
    )
    nuevo_profesor.set_password(password)

    db.session.add(nuevo_profesor)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Docente "{nombre}" dado de alta exitosamente.',
        'profesor': nuevo_profesor.to_dict()
    }), 201


@admin_bp.route('/profesores/<int:profesor_id>', methods=['PUT'])
@jwt_required()
def update_profesor(profesor_id):
    admin = get_current_admin()
    if not admin:
        return jsonify({'success': False, 'message': 'Acceso restringido únicamente para administradores.'}), 403

    profesor = Profesor.query.get(profesor_id)
    if not profesor:
        return jsonify({'success': False, 'message': 'Docente no encontrado.'}), 404

    data = request.get_json() or {}
    nombre = data.get('nombre', '').strip()
    email = data.get('email', '').strip() or None
    password = data.get('password', '').strip()

    matricula = data.get('matricula', '').strip().upper()
    if matricula and matricula != profesor.matricula:
        existing_mat = Profesor.query.filter_by(matricula=matricula).first()
        if existing_mat:
            return jsonify({'success': False, 'message': f'La matrícula "{matricula}" ya está registrada con otro docente.'}), 409
        profesor.matricula = matricula

    if nombre:
        profesor.nombre = nombre
    if email is not None:
        # Check uniqueness if changed
        if email and email != profesor.email:
            existing = Profesor.query.filter_by(email=email).first()
            if existing:
                return jsonify({'success': False, 'message': f'El correo "{email}" ya está registrado con otro docente.'}), 409
        profesor.email = email
    if password:
        profesor.set_password(password)

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Datos del docente actualizados correctamente.',
        'profesor': profesor.to_dict()
    }), 200


@admin_bp.route('/profesores/<int:profesor_id>', methods=['DELETE'])
@jwt_required()
def delete_profesor(profesor_id):
    admin = get_current_admin()
    if not admin:
        return jsonify({'success': False, 'message': 'Acceso restringido únicamente para administradores.'}), 403

    profesor = Profesor.query.get(profesor_id)
    if not profesor:
        return jsonify({'success': False, 'message': 'Docente no encontrado.'}), 404

    nombre = profesor.nombre
    matricula = profesor.matricula

    db.session.delete(profesor)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Docente "{nombre}" ({matricula}) eliminado del sistema.'
    }), 200
