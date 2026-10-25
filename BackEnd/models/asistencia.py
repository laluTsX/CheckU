from datetime import datetime
from extensions import db

class Asistencia(db.Model):
    __tablename__ = 'asistencias'

    id = db.Column(db.Integer, primary_key=True)
    sesion_id = db.Column(db.Integer, db.ForeignKey('sesiones_qr.id', ondelete='CASCADE'), nullable=False)
    alumno_id = db.Column(db.Integer, db.ForeignKey('alumnos.id', ondelete='CASCADE'), nullable=False)
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    estado = db.Column(db.String(20), default='PRESENTE', nullable=False)

    # Prevent duplicate attendance records for the same student in the same QR session
    __table_args__ = (
        db.UniqueConstraint('sesion_id', 'alumno_id', name='uq_sesion_alumno_asistencia'),
    )

    # Relationships
    sesion = db.relationship('SesionQR', back_populates='asistencias')
    alumno = db.relationship('Alumno', back_populates='asistencias')

    def to_dict(self):
        return {
            'id': self.id,
            'sesion_id': self.sesion_id,
            'alumno_id': self.alumno_id,
            'alumno_matricula': self.alumno.matricula if self.alumno else '',
            'alumno_nombre': self.alumno.nombre if self.alumno else '',
            'alumno_carrera': self.alumno.carrera if self.alumno else '',
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None,
            'estado': self.estado,
            'es_justificada': self.estado == 'JUSTIFICADA'
        }


    def __repr__(self):
        return f'<Asistencia Alumno {self.alumno_id} - Sesion {self.sesion_id}>'
