from datetime import datetime
from extensions import db
from models.grupo_alumno import grupo_alumno

class Alumno(db.Model):
    __tablename__ = 'alumnos'

    id = db.Column(db.Integer, primary_key=True)
    matricula = db.Column(db.String(30), unique=True, nullable=False, index=True)
    nombre = db.Column(db.String(120), nullable=False)
    carrera = db.Column(db.String(120), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    grupos = db.relationship(
        'Grupo',
        secondary=grupo_alumno,
        back_populates='alumnos',
        lazy='subquery'
    )
    asistencias = db.relationship(
        'Asistencia',
        back_populates='alumno',
        lazy=True,
        cascade='all, delete-orphan'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'matricula': self.matricula,
            'nombre': self.nombre,
            'carrera': self.carrera or '',
            'email': self.email or '',
            'role': 'alumno',
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<Alumno {self.matricula} - {self.nombre}>'
