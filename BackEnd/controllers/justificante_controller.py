import os
import uuid
from datetime import datetime, date
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from werkzeug.utils import secure_filename
from extensions import db
from models.justificante import Justificante
from models.alumno import Alumno
from models.grupo import Grupo
from models.sesion_qr import SesionQR
from models.asistencia import Asistencia
from models.profesor import Profesor

justificante_bp = Blueprint('justificante_bp', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'webp'}
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'justificantes')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@justificante_bp.route('/subir', methods=['POST'])
def subir_justificante():
    """
    Upload absence excuse receipt (PDF or Image) and recover student absence.
    Accepts multipart/form-data.
    """
    if 'archivo' not in request.files:
        return jsonify({'success': False, 'message': 'No se proporcionó ningún archivo de comprobante.'}), 400

    archivo = request.files['archivo']
    if archivo.filename == '':
        return jsonify({'success': False, 'message': 'El archivo seleccionado está vacío.'}), 400

    if not allowed_file(archivo.filename):
        return jsonify({
            'success': False,
            'message': f'Formato no permitido. Solo se aceptan archivos PDF o imágenes ({", ".join(ALLOWED_EXTENSIONS)}).'
        }), 400

    # Retrieve form fields
    matricula = request.form.get('matricula', '').strip().upper()
    alumno_id = request.form.get('alumno_id', type=int)
    grupo_id = request.form.get('grupo_id', type=int)
    sesion_id = request.form.get('sesion_id', type=int)
    fecha_falta_str = request.form.get('fecha_falta', '').strip()
    motivo = request.form.get('motivo', '').strip()
    comentarios = request.form.get('comentarios', '').strip()

    if not motivo:
        return jsonify({'success': False, 'message': 'El motivo del justificante es obligatorio.'}), 400

    if not grupo_id:
        return jsonify({'success': False, 'message': 'El ID del grupo es obligatorio.'}), 400

    # Look up student
    alumno = None
    if alumno_id:
        alumno = Alumno.query.get(alumno_id)
    elif matricula:
        alumno = Alumno.query.filter_by(matricula=matricula).first()

    if not alumno:
        return jsonify({'success': False, 'message': 'Alumno no encontrado. Especifica una matrícula válida.'}), 404

    grupo = Grupo.query.get(grupo_id)
    if not grupo:
        return jsonify({'success': False, 'message': 'Grupo no encontrado.'}), 404

    # Parse date of missed class
    fecha_falta = None
    if fecha_falta_str:
        try:
            fecha_falta = datetime.strptime(fecha_falta_str, '%Y-%m-%d').date()
        except ValueError:
            pass
    
    if not fecha_falta:
        fecha_falta = date.today()

    # Save file safely
    orig_name = secure_filename(archivo.filename)
    extension = orig_name.rsplit('.', 1)[1].lower() if '.' in orig_name else 'dat'
    file_type = 'pdf' if extension == 'pdf' else 'image'
    unique_filename = f"justificante_{alumno.matricula}_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:6]}.{extension}"
    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
    archivo.save(file_path)

    # Public download URL
    archivo_url = f"/api/justificantes/archivo/{unique_filename}"

    # If sesion_id was not explicitly given, try to find a session on that date for this group
    sesion = None
    if sesion_id:
        sesion = SesionQR.query.get(sesion_id)
    else:
        # Look for a session created on fecha_falta
        sesion = (
            SesionQR.query
            .filter(SesionQR.grupo_id == grupo.id, db.func.date(SesionQR.fecha_creacion) == fecha_falta)
            .first()
        )

    # Create Justificante record (default APROBADO so it recovers the absence immediately)
    nuevo_justificante = Justificante(
        alumno_id=alumno.id,
        grupo_id=grupo.id,
        sesion_id=sesion.id if sesion else None,
        fecha_falta=fecha_falta,
        motivo=motivo,
        archivo_url=archivo_url,
        nombre_original=orig_name,
        tipo_archivo=file_type,
        estado='APROBADO',
        comentarios=comentarios
    )
    db.session.add(nuevo_justificante)
    db.session.flush()

    # Mark or create Asistencia as JUSTIFICADA to recover the student's absence
    if sesion:
        asistencia = Asistencia.query.filter_by(sesion_id=sesion.id, alumno_id=alumno.id).first()
        if asistencia:
            asistencia.estado = 'JUSTIFICADA'
        else:
            nueva_asistencia = Asistencia(
                sesion_id=sesion.id,
                alumno_id=alumno.id,
                fecha_registro=datetime.combine(fecha_falta, datetime.min.time()),
                estado='JUSTIFICADA'
            )
            db.session.add(nueva_asistencia)
    else:
        # If no explicit QR session existed on that day, create a dummy or anchor session for the group so the recovered attendance is counted!
        anchor_sesion = SesionQR.query.filter_by(grupo_id=grupo.id).order_by(SesionQR.id.desc()).first()
        if anchor_sesion:
            asistencia = Asistencia.query.filter_by(sesion_id=anchor_sesion.id, alumno_id=alumno.id).first()
            if asistencia:
                asistencia.estado = 'JUSTIFICADA'
            else:
                nueva_asistencia = Asistencia(
                    sesion_id=anchor_sesion.id,
                    alumno_id=alumno.id,
                    fecha_registro=datetime.utcnow(),
                    estado='JUSTIFICADA'
                )
                db.session.add(nueva_asistencia)

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Justificante registrado y falta recuperada exitosamente para {alumno.nombre}.',
        'justificante': nuevo_justificante.to_dict()
    }), 201


@justificante_bp.route('/grupo/<int:grupo_id>', methods=['GET'])
@jwt_required()
def get_justificantes_grupo(grupo_id):
    """List all justificantes for a specific class group."""
    grupo = Grupo.query.get(grupo_id)
    if not grupo:
        return jsonify({'success': False, 'message': 'Grupo no encontrado.'}), 404

    justificantes = Justificante.query.filter_by(grupo_id=grupo.id).order_by(Justificante.fecha_falta.desc()).all()
    return jsonify({
        'success': True,
        'justificantes': [j.to_dict() for j in justificantes]
    }), 200


@justificante_bp.route('/alumno', methods=['GET'])
@jwt_required()
def get_justificantes_alumno():
    """List all justificantes submitted by or for the logged in student."""
    identity = get_jwt_identity()
    claims = get_jwt()

    alumno = Alumno.query.filter_by(matricula=identity).first()
    if not alumno:
        return jsonify({'success': False, 'message': 'Alumno no encontrado.'}), 404

    justificantes = Justificante.query.filter_by(alumno_id=alumno.id).order_by(Justificante.fecha_falta.desc()).all()
    return jsonify({
        'success': True,
        'justificantes': [j.to_dict() for j in justificantes]
    }), 200


@justificante_bp.route('/archivo/<path:filename>', methods=['GET'])
def descargar_archivo(filename):
    """Serve uploaded justification file (PDF or image)."""
    return send_from_directory(UPLOAD_FOLDER, filename)


@justificante_bp.route('/<int:justificante_id>/aprobar', methods=['POST'])
@jwt_required()
def aprobar_justificante(justificante_id):
    """Professor or Admin approves absence justification."""
    justificante = Justificante.query.get(justificante_id)
    if not justificante:
        return jsonify({'success': False, 'message': 'Justificante no encontrado.'}), 404

    justificante.estado = 'APROBADO'

    # Recover absence in Asistencia
    if justificante.sesion_id:
        asistencia = Asistencia.query.filter_by(sesion_id=justificante.sesion_id, alumno_id=justificante.alumno_id).first()
        if asistencia:
            asistencia.estado = 'JUSTIFICADA'
        else:
            nueva_asistencia = Asistencia(
                sesion_id=justificante.sesion_id,
                alumno_id=justificante.alumno_id,
                fecha_registro=datetime.utcnow(),
                estado='JUSTIFICADA'
            )
            db.session.add(nueva_asistencia)

    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Justificante aprobado y asistencia recuperada.',
        'justificante': justificante.to_dict()
    }), 200


@justificante_bp.route('/<int:justificante_id>/rechazar', methods=['POST'])
@jwt_required()
def rechazar_justificante(justificante_id):
    """Professor rejects absence justification."""
    justificante = Justificante.query.get(justificante_id)
    if not justificante:
        return jsonify({'success': False, 'message': 'Justificante no encontrado.'}), 404

    justificante.estado = 'RECHAZADO'
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Justificante rechazado.',
        'justificante': justificante.to_dict()
    }), 200


@justificante_bp.route('/<int:justificante_id>', methods=['DELETE'])
@jwt_required()
def eliminar_justificante(justificante_id):
    """Delete justification."""
    justificante = Justificante.query.get(justificante_id)
    if not justificante:
        return jsonify({'success': False, 'message': 'Justificante no encontrado.'}), 404

    # Remove physical file if present
    try:
        fname = os.path.basename(justificante.archivo_url)
        fpath = os.path.join(UPLOAD_FOLDER, fname)
        if os.path.exists(fpath):
            os.remove(fpath)
    except Exception:
        pass

    db.session.delete(justificante)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Justificante eliminado correctamente.'}), 200
