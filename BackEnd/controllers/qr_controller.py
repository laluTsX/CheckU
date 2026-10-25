import uuid
import io
import base64
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import qrcode
from extensions import db
from models.profesor import Profesor
from models.alumno import Alumno
from models.grupo import Grupo
from models.sesion_qr import SesionQR
from models.asistencia import Asistencia

qr_bp = Blueprint('qr_bp', __name__)

def generate_qr_base64(data_string):
    """Generates a base64 encoded PNG QR code image with CheckU color styling."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=3,
    )
    qr.add_data(data_string)
    qr.make(fit=True)

    # Use CheckU navy (#172B4D) on clean white background
    img = qr.make_image(fill_color="#172B4D", back_color="#FFFFFF")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
    return f"data:image/png;base64,{img_b64}"


@qr_bp.route('/generar', methods=['POST'])
@jwt_required()
def generar_qr():
    identity = get_jwt_identity()
    claims = get_jwt()
    if claims.get('role') != 'profesor':
        return jsonify({'success': False, 'message': 'Solo los profesores pueden generar sesiones QR.'}), 403

    profesor = Profesor.query.filter_by(matricula=identity).first()
    if not profesor:
        return jsonify({'success': False, 'message': 'Profesor no encontrado.'}), 404

    data = request.get_json() or {}
    grupo_id = data.get('grupo_id')

    if not grupo_id:
        return jsonify({'success': False, 'message': 'El ID del grupo es obligatorio.'}), 400


    grupo = Grupo.query.filter_by(id=grupo_id, profesor_id=profesor.id).first()
    if not grupo:
        return jsonify({'success': False, 'message': 'Grupo no encontrado o no pertenece al docente.'}), 404

    # Calculate duration: use explicit minutos_vigencia or calculate from class hours
    minutos_param = data.get('minutos_vigencia')
    if minutos_param:
        minutos_vigencia = int(minutos_param)
    else:
        minutos_vigencia = 60
        if grupo.hora_inicio and grupo.hora_fin:

            try:
                h_ini = datetime.strptime(grupo.hora_inicio, '%H:%M')
                h_fin = datetime.strptime(grupo.hora_fin, '%H:%M')
                diff_min = int((h_fin - h_ini).total_seconds() / 60)
                if diff_min > 0:
                    minutos_vigencia = diff_min
            except Exception:
                pass

    now = datetime.utcnow()
    fecha_expiracion = now + timedelta(minutes=minutos_vigencia)

    # Deactivate any previous active session for this group
    SesionQR.query.filter_by(grupo_id=grupo.id, activo=True).update({'activo': False})

    # Generate unique QR token with date stamp and random hex to be unique per class
    import random
    active_pins = {s.codigo_pin for s in SesionQR.query.filter_by(activo=True).all() if s.codigo_pin}
    codigo_pin = None
    for _ in range(50):
        candidate = str(random.randint(100, 999))
        if candidate not in active_pins:
            codigo_pin = candidate
            break
    if not codigo_pin:
        codigo_pin = str(random.randint(100, 999))

    session_stamp = now.strftime('%Y%m%d-%H%M')
    token_qr = f"CHECKU-{grupo.codigo_grupo}-{session_stamp}-{uuid.uuid4().hex[:6].upper()}"

    nueva_sesion = SesionQR(
        grupo_id=grupo.id,
        token_qr=token_qr,
        codigo_pin=codigo_pin,
        fecha_creacion=now,
        fecha_expiracion=fecha_expiracion,
        activo=True
    )
    db.session.add(nueva_sesion)
    db.session.commit()


    # Generate Base64 QR code image containing the token
    qr_image_data = generate_qr_base64(token_qr)

    return jsonify({
        'success': True,
        'message': 'Sesión de asistencia QR generada exitosamente.',
        'sesion': {
            'id': nueva_sesion.id,
            'grupo_id': grupo.id,
            'nombre_materia': grupo.nombre_materia,
            'codigo_grupo': grupo.codigo_grupo,
            'aula': grupo.aula,
            'token_qr': token_qr,
            'codigo_pin': codigo_pin,
            'qr_image': qr_image_data,
            'fecha_creacion': nueva_sesion.fecha_creacion.isoformat(),
            'fecha_expiracion': nueva_sesion.fecha_expiracion.isoformat(),
            'segundos_restantes': int((nueva_sesion.fecha_expiracion - datetime.utcnow()).total_seconds()),
            'activo': nueva_sesion.activo,
            'total_inscritos': len(grupo.alumnos)
        }
    }), 201


@qr_bp.route('/sesion/<token_qr>/asistencias', methods=['GET'])
def get_sesion_asistencias(token_qr):
    """Real-time live feed of attendance for an active session (for projector & mobile)"""
    sesion = SesionQR.query.filter_by(token_qr=token_qr).first()
    if not sesion:
        return jsonify({'success': False, 'message': 'Sesión no encontrada.'}), 404

    now = datetime.utcnow()
    segundos_restantes = max(0, int((sesion.fecha_expiracion - now).total_seconds()))
    is_valid = sesion.activo and (now <= sesion.fecha_expiracion)

    # Fetch recorded attendances
    asistencias = Asistencia.query.filter_by(sesion_id=sesion.id).order_by(Asistencia.fecha_registro.desc()).all()
    total_inscritos = len(sesion.grupo.alumnos) if sesion.grupo else 0
    total_registrados = len(asistencias)
    porcentaje = round((total_registrados / total_inscritos * 100), 1) if total_inscritos > 0 else 0

    return jsonify({
        'success': True,
        'sesion': {
            'id': sesion.id,
            'token_qr': sesion.token_qr,
            'grupo_id': sesion.grupo_id,
            'nombre_materia': sesion.grupo.nombre_materia if sesion.grupo else '',
            'codigo_grupo': sesion.grupo.codigo_grupo if sesion.grupo else '',
            'aula': sesion.grupo.aula if sesion.grupo else '',
            'codigo_pin': sesion.codigo_pin,
            'activo': sesion.activo,
            'is_valid': is_valid,
            'segundos_restantes': segundos_restantes,
            'fecha_expiracion': sesion.fecha_expiracion.isoformat()
        },
        'estadisticas': {
            'total_inscritos': total_inscritos,
            'total_registrados': total_registrados,
            'porcentaje_asistencia': porcentaje
        },
        'asistencias': [a.to_dict() for a in asistencias]
    }), 200


@qr_bp.route('/cerrar/<token_qr>', methods=['POST'])
@jwt_required()
def cerrar_sesion_qr(token_qr):
    """Teacher closes/deactivates an active QR session immediately"""
    sesion = SesionQR.query.filter_by(token_qr=token_qr).first()
    if not sesion:
        return jsonify({'success': False, 'message': 'Sesión no encontrada.'}), 404

    sesion.activo = False
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Sesión de asistencia cerrada correctamente.',
        'total_asistencias': len(sesion.asistencias)
    }), 200


@qr_bp.route('/escanear', methods=['POST'])
def escanear_qr():
    """
    Endpoint for students scanning QR or entering 3-digit class PIN:
    Validates QR validity, enrollment, expiration, and prevents duplicates.
    Can be called with JWT token in header OR explicitly passing matricula in payload.
    """
    data = request.get_json() or {}
    token_qr = data.get('token_qr', '').strip()
    codigo_pin = data.get('codigo_pin', '').strip()
    matricula = data.get('matricula', '').strip().upper()

    # If token_qr is 3 or 4 digits, interpret as PIN
    if token_qr and token_qr.isdigit() and len(token_qr) <= 4:
        codigo_pin = token_qr
        token_qr = ''

    # Check if user is authenticated via Bearer token
    auth_header = request.headers.get('Authorization')
    if auth_header and not matricula:
        try:
            from flask_jwt_extended import decode_token
            raw_token = auth_header.replace('Bearer ', '').strip()
            decoded = decode_token(raw_token)
            matricula = decoded.get('sub', '').upper()
        except Exception:
            pass

    if not token_qr and not codigo_pin:
        return jsonify({
            'success': False,
            'code': 'MISSING_DATA',
            'message': 'El token QR o código de 3 dígitos es obligatorio.'
        }), 400

    if not matricula:
        return jsonify({
            'success': False,
            'code': 'MISSING_DATA',
            'message': 'La matrícula del alumno es obligatoria.'
        }), 400

    # 1. Look up student
    alumno = Alumno.query.filter_by(matricula=matricula).first()
    if not alumno:
        return jsonify({
            'success': False,
            'code': 'ALUMNO_NOT_FOUND',
            'message': f'La matrícula "{matricula}" no existe en el sistema.'
        }), 404

    # 2. Look up QR session by PIN or by token
    sesion = None
    if codigo_pin:
        posibles = SesionQR.query.filter_by(codigo_pin=codigo_pin, activo=True).order_by(SesionQR.id.desc()).all()
        # Prefer session belonging to a group student is enrolled in
        for s in posibles:
            if not s.is_expired and s.grupo and alumno in s.grupo.alumnos:
                sesion = s
                break
        if not sesion:
            for s in posibles:
                if not s.is_expired:
                    sesion = s
                    break
        if not sesion and posibles:
            sesion = posibles[0]
        if not sesion:
            sesion = SesionQR.query.filter_by(codigo_pin=codigo_pin).order_by(SesionQR.id.desc()).first()
    elif token_qr:
        sesion = SesionQR.query.filter_by(token_qr=token_qr).first()

    if not sesion:
        return jsonify({
            'success': False,
            'code': 'QR_NOT_FOUND',
            'message': 'El código QR o código de 3 dígitos no es válido o no existe.'
        }), 404

    # 3. Check if session was deactivated
    if not sesion.activo:
        return jsonify({
            'success': False,
            'code': 'SESSION_INACTIVE',
            'message': 'La sesión de pase de lista ha sido finalizada por el docente.'
        }), 400

    # 4. Check if session has expired
    if sesion.is_expired:
        return jsonify({
            'success': False,
            'code': 'QR_EXPIRED',
            'message': 'El código QR ha caducado. Solicita al profesor proyectar un código vigente.'
        }), 400

    # 5. Check student enrollment in the group
    grupo = sesion.grupo
    if alumno not in grupo.alumnos:
        return jsonify({
            'success': False,
            'code': 'NOT_ENROLLED',
            'message': f'No estás inscrito en la asignatura "{grupo.nombre_materia}". Contacta a tu profesor.'
        }), 403

    # 6. Check if student already registered attendance for this session (No duplicates)
    existente = Asistencia.query.filter_by(sesion_id=sesion.id, alumno_id=alumno.id).first()
    if existente:
        return jsonify({
            'success': False,
            'code': 'ALREADY_REGISTERED',
            'message': f'Ya registraste tu asistencia para esta clase el {existente.fecha_registro.strftime("%H:%M:%S")}.',
            'fecha_registro': existente.fecha_registro.isoformat()
        }), 409

    # 7. Register new attendance
    ahora = datetime.utcnow()
    nueva_asistencia = Asistencia(
        sesion_id=sesion.id,
        alumno_id=alumno.id,
        fecha_registro=ahora,
        estado='PRESENTE'
    )
    db.session.add(nueva_asistencia)
    db.session.commit()

    return jsonify({
        'success': True,
        'code': 'ATTENDANCE_SUCCESS',
        'message': '¡Asistencia registrada exitosamente!',
        'asistencia': {
            'id': nueva_asistencia.id,
            'alumno': alumno.nombre,
            'matricula': alumno.matricula,
            'materia': grupo.nombre_materia,
            'codigo_grupo': grupo.codigo_grupo,
            'aula': grupo.aula,
            'profesor': grupo.profesor.nombre if grupo.profesor else '',
            'fecha_registro': ahora.isoformat(),
            'hora_formateada': ahora.strftime('%H:%M:%S')
        }
    }), 201
