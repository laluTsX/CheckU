from datetime import datetime
from extensions import db

# Association table between Grupo and Alumno
grupo_alumno = db.Table(
    'grupo_alumno',
    db.Column('id', db.Integer, primary_key=True),
    db.Column('grupo_id', db.Integer, db.ForeignKey('grupos.id', ondelete='CASCADE'), nullable=False),
    db.Column('alumno_id', db.Integer, db.ForeignKey('alumnos.id', ondelete='CASCADE'), nullable=False),
    db.Column('fecha_inscripcion', db.DateTime, default=datetime.utcnow, nullable=False),
    db.UniqueConstraint('grupo_id', 'alumno_id', name='uq_grupo_alumno')
)
