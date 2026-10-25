from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from models.profesor import Profesor
from models.alumno import Alumno
from models.administrador import Administrador
from extensions import db

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/login', methods=['POST'])
def multifunctional_login():
    """
    Multifunctional unified login endpoint:
    Validates credentials directly for Admin or Profesor, issues signed JWT token with role claims,
    and returns routing information so the client can redirect directly to their dashboard.
    Enforces that students (alumnos) do NOT have access to the web portal.
    """
    data = request.get_json() or {}
    identificador = (
        data.get('identificador') or 
        data.get('matricula') or 
        data.get('usuario') or 
        data.get('email') or ''
    ).strip()
    password = data.get('password', '').strip()
    origen = (data.get('origen') or 'web').strip().lower()

    if not identificador:
        return jsonify({
            'success': False,
            'message': 'Por favor ingresa tu matrícula o usuario institucional.'
        }), 400

    # 1. Administrador Verification
    admin = Administrador.query.filter(
        (Administrador.usuario == identificador.lower()) | 
        (Administrador.email == identificador.lower())
    ).first()
    if admin:
        if not password:
            return jsonify({
                'success': False,
                'message': 'Por favor ingresa tu contraseña de administrador.'
            }), 400
        if admin.check_password(password):
            additional_claims = {
                'role': 'admin',
                'id': admin.id,
                'nombre': admin.nombre,
                'usuario': admin.usuario,
                'email': admin.email
            }
            access_token = create_access_token(
                identity=admin.usuario,
                additional_claims=additional_claims
            )
            return jsonify({
                'success': True,
                'message': f'Bienvenido(a), {admin.nombre}.',
                'access_token': access_token,
                'role': 'admin',
                'dashboard': '/admin',
                'user': admin.to_dict()
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Contraseña incorrecta para la cuenta de Administrador.'
            }), 401

    # 2. Profesor / Docente Verification
    profesor = Profesor.query.filter(
        (Profesor.matricula == identificador.upper()) | 
        (Profesor.matricula == identificador) | 
        (Profesor.email == identificador.lower())
    ).first()
    if profesor:
        if not password:
            return jsonify({
                'success': False,
                'message': 'Por favor ingresa tu contraseña docente.'
            }), 400
        if profesor.check_password(password):
            additional_claims = {
                'role': 'profesor',
                'id': profesor.id,
                'nombre': profesor.nombre,
                'email': profesor.email
            }
            access_token = create_access_token(
                identity=profesor.matricula,
                additional_claims=additional_claims
            )
            return jsonify({
                'success': True,
                'message': f'Bienvenido(a), {profesor.nombre}.',
                'access_token': access_token,
                'role': 'profesor',
                'dashboard': '/dashboard',
                'user': profesor.to_dict()
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Contraseña incorrecta para la cuenta de profesor.'
            }), 401

    # 3. Alumno Verification - Alumno NO tiene acceso al portal web
    alumno = Alumno.query.filter(
        (Alumno.matricula == identificador.upper()) | 
        (Alumno.matricula == identificador) | 
        (Alumno.email == identificador.lower())
    ).first()
    if alumno:
        if origen == 'web':
            return jsonify({
                'success': False,
                'code': 'ALUMNO_WEB_RESTRICTED',
                'message': 'El acceso para alumnos es exclusivo mediante la aplicación móvil CheckU. El portal web está reservado para Docentes y Administradores.'
            }), 403
        else:
            # Válido para la aplicación móvil
            additional_claims = {
                'role': 'alumno',
                'id': alumno.id,
                'nombre': alumno.nombre,
                'carrera': alumno.carrera
            }
            access_token = create_access_token(
                identity=alumno.matricula,
                additional_claims=additional_claims
            )
            return jsonify({
                'success': True,
                'message': f'Bienvenido(a), {alumno.nombre}.',
                'access_token': access_token,
                'role': 'alumno',
                'user': alumno.to_dict()
            }), 200

    return jsonify({
        'success': False,
        'message': 'Matrícula o usuario no encontrados. Verifica tus datos de acceso.'
    }), 401


@auth_bp.route('/profesor/login', methods=['POST'])
def login_profesor():
    data = request.get_json() or {}
    matricula = data.get('matricula', '').strip()
    password = data.get('password', '').strip()

    if not matricula or not password:
        return jsonify({
            'success': False,
            'message': 'Matrícula (o nómina) y contraseña son requeridas.'
        }), 400

    if matricula.lower() == 'admin':
        admin = Administrador.query.filter_by(usuario='admin').first()
        if admin and admin.check_password(password):
            additional_claims = {
                'role': 'admin',
                'id': admin.id,
                'nombre': admin.nombre,
                'usuario': admin.usuario,
                'email': admin.email
            }
            access_token = create_access_token(
                identity=admin.usuario,
                additional_claims=additional_claims
            )
            return jsonify({
                'success': True,
                'message': 'Inicio de sesión exitoso como administrador.',
                'access_token': access_token,
                'role': 'admin',
                'user': admin.to_dict()
            }), 200

    profesor = Profesor.query.filter_by(matricula=matricula).first()
    if not profesor or not profesor.check_password(password):
        return jsonify({
            'success': False,
            'message': 'Credenciales inválidas. Verifica tu matrícula y contraseña.'
        }), 401

    additional_claims = {
        'role': 'profesor',
        'id': profesor.id,
        'nombre': profesor.nombre,
        'email': profesor.email
    }
    access_token = create_access_token(
        identity=profesor.matricula,
        additional_claims=additional_claims
    )

    return jsonify({
        'success': True,
        'message': 'Inicio de sesión exitoso como docente.',
        'access_token': access_token,
        'role': 'profesor',
        'user': profesor.to_dict()
    }), 200


@auth_bp.route('/admin/login', methods=['POST'])
def login_admin():
    data = request.get_json() or {}
    usuario = data.get('usuario', '').strip() or data.get('matricula', '').strip()
    password = data.get('password', '').strip()

    if not usuario or not password:
        return jsonify({
            'success': False,
            'message': 'Usuario de administrador y contraseña son requeridos.'
        }), 400

    admin = Administrador.query.filter_by(usuario=usuario).first()
    if not admin or not admin.check_password(password):
        return jsonify({
            'success': False,
            'message': 'Credenciales de administrador inválidas.'
        }), 401

    additional_claims = {
        'role': 'admin',
        'id': admin.id,
        'nombre': admin.nombre,
        'usuario': admin.usuario,
        'email': admin.email
    }
    access_token = create_access_token(
        identity=admin.usuario,
        additional_claims=additional_claims
    )

    return jsonify({
        'success': True,
        'message': 'Inicio de sesión exitoso como administrador.',
        'access_token': access_token,
        'role': 'admin',
        'user': admin.to_dict()
    }), 200


@auth_bp.route('/alumno/login', methods=['POST'])
def login_alumno():
    data = request.get_json() or {}
    matricula = data.get('matricula', '').strip()

    if not matricula:
        return jsonify({
            'success': False,
            'message': 'La matrícula del alumno es obligatoria.'
        }), 400

    alumno = Alumno.query.filter_by(matricula=matricula).first()
    if not alumno:
        return jsonify({
            'success': False,
            'code': 'ALUMNO_NOT_FOUND',
            'message': f'La matrícula "{matricula}" no se encuentra registrada en el sistema CheckU.'
        }), 404

    additional_claims = {
        'role': 'alumno',
        'id': alumno.id,
        'nombre': alumno.nombre,
        'carrera': alumno.carrera
    }
    access_token = create_access_token(
        identity=alumno.matricula,
        additional_claims=additional_claims
    )

    return jsonify({
        'success': True,
        'message': f'Bienvenido(a), {alumno.nombre}.',
        'access_token': access_token,
        'role': 'alumno',
        'user': alumno.to_dict()
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    identity = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role')

    if role == 'profesor':
        profesor = Profesor.query.filter_by(matricula=identity).first()
        if not profesor:
            return jsonify({'success': False, 'message': 'Docente no encontrado'}), 404
        return jsonify({'success': True, 'user': profesor.to_dict()}), 200
    elif role == 'alumno':
        alumno = Alumno.query.filter_by(matricula=identity).first()
        if not alumno:
            return jsonify({'success': False, 'message': 'Alumno no encontrado'}), 404
        return jsonify({'success': True, 'user': alumno.to_dict()}), 200
    elif role == 'admin':
        admin = Administrador.query.filter_by(usuario=identity).first()
        if not admin:
            return jsonify({'success': False, 'message': 'Administrador no encontrado'}), 404
        return jsonify({'success': True, 'user': admin.to_dict()}), 200

    return jsonify({'success': False, 'message': 'Rol no reconocido'}), 400


@auth_bp.route('/verify', methods=['GET', 'POST'])
@jwt_required()
def verify_token():
    """
    Verifica la validez y firma del token JWT actual.
    Retorna el rol y los claims para validación y enrutamiento seguro al dashboard correspondiente.
    """
    identity = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role')

    origen = request.args.get('origen') or (request.get_json(silent=True) or {}).get('origen', '')
    if origen == 'web' and role == 'alumno':
        return jsonify({
            'valid': False,
            'role': 'alumno',
            'message': 'Acceso no permitido: los alumnos no tienen acceso al portal web. Utiliza la app móvil.'
        }), 403

    dashboard = '/admin' if role == 'admin' else '/dashboard' if role == 'profesor' else None

    return jsonify({
        'valid': True,
        'identity': identity,
        'role': role,
        'dashboard': dashboard,
        'claims': claims
    }), 200

