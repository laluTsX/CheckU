from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db

class Profesor(db.Model):
    __tablename__ = 'profesores'

    id = db.Column(db.Integer, primary_key=True)
    matricula = db.Column(db.String(30), unique=True, nullable=False, index=True)
    nombre = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    grupos = db.relationship('Grupo', back_populates='profesor', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'matricula': self.matricula,
            'nombre': self.nombre,
            'email': self.email,
            'role': 'profesor',
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<Profesor {self.matricula} - {self.nombre}>'
