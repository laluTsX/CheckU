from datetime import datetime
from extensions import db

class Justificante(db.Model):
    __tablename__ = 'justificantes'

    id = db.Column(db.Integer, primary_key=True)
    alumno_id = db.Column(db.Integer, db.ForeignKey('alumnos.id', ondelete='CASCADE'), nullable=False)
    grupo_id = db.Column(db.Integer, db.ForeignKey('grupos.id', ondelete='CASCADE'), nullable=False)
    sesion_id = db.Column(db.Integer, db.ForeignKey('sesiones_qr.id', ondelete='SET NULL'), nullable=True)
    fecha_falta = db.Column(db.Date, nullable=False)
    motivo = db.Column(db.String(255), nullable=False)
    archivo_url = db.Column(db.String(255), nullable=False)
    nombre_original = db.Column(db.String(255), nullable=True)
    tipo_archivo = db.Column(db.String(50), nullable=True)  # 'pdf', 'image'
    estado = db.Column(db.String(20), default='APROBADO', nullable=False)  # 'PENDIENTE', 'APROBADO', 'RECHAZADO'
    comentarios = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    alumno = db.relationship('Alumno', backref=db.backref('justificantes', lazy=True, cascade='all, delete-orphan'))
    grupo = db.relationship('Grupo', back_populates='justificantes')
    sesion = db.relationship('SesionQR', backref=db.backref('justificantes', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'alumno_id': self.alumno_id,
            'alumno_matricula': self.alumno.matricula if self.alumno else '',
            'alumno_nombre': self.alumno.nombre if self.alumno else '',
            'alumno_carrera': self.alumno.carrera if self.alumno else '',
            'grupo_id': self.grupo_id,
            'grupo_materia': self.grupo.nombre_materia if self.grupo else '',
            'grupo_codigo': self.grupo.codigo_grupo if self.grupo else '',
            'sesion_id': self.sesion_id,
            'fecha_falta': self.fecha_falta.isoformat() if self.fecha_falta else '',
            'motivo': self.motivo,
            'archivo_url': self.archivo_url,
            'nombre_original': self.nombre_original or '',
            'tipo_archivo': self.tipo_archivo or 'document',
            'estado': self.estado,
            'comentarios': self.comentarios or '',
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<Justificante Alumno {self.alumno_id} - Grupo {self.grupo_id} - Fecha {self.fecha_falta}>'
