from datetime import datetime
from extensions import db

class SesionQR(db.Model):
    __tablename__ = 'sesiones_qr'

    id = db.Column(db.Integer, primary_key=True)
    grupo_id = db.Column(db.Integer, db.ForeignKey('grupos.id', ondelete='CASCADE'), nullable=False)
    token_qr = db.Column(db.String(100), unique=True, nullable=False, index=True)
    codigo_pin = db.Column(db.String(10), nullable=True, index=True)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    fecha_expiracion = db.Column(db.DateTime, nullable=False)
    activo = db.Column(db.Boolean, default=True, nullable=False)

    # Relationships
    grupo = db.relationship('Grupo', back_populates='sesiones_qr')
    asistencias = db.relationship(
        'Asistencia',
        back_populates='sesion',
        lazy=True,
        cascade='all, delete-orphan'
    )

    @property
    def is_expired(self):
        return datetime.utcnow() > self.fecha_expiracion

    @property
    def is_valid(self):
        return self.activo and not self.is_expired

    def to_dict(self, include_asistencias=False):
        data = {
            'id': self.id,
            'grupo_id': self.grupo_id,
            'token_qr': self.token_qr,
            'codigo_pin': self.codigo_pin,
            'materia': self.grupo.nombre_materia if self.grupo else '',
            'codigo_grupo': self.grupo.codigo_grupo if self.grupo else '',
            'aula': self.grupo.aula if self.grupo else '',
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'fecha_expiracion': self.fecha_expiracion.isoformat() if self.fecha_expiracion else None,
            'activo': self.activo,
            'is_valid': self.is_valid,
            'total_asistencias': len(self.asistencias)
        }
        if include_asistencias:
            data['asistencias'] = [asist.to_dict() for asist in self.asistencias]
        return data

    def __repr__(self):
        return f'<SesionQR {self.token_qr} - Grupo {self.grupo_id}>'
