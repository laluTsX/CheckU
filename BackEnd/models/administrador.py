from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db

class Administrador(db.Model):
    __tablename__ = 'administradores'

    id = db.Column(db.Integer, primary_key=True)
    usuario = db.Column(db.String(50), unique=True, nullable=False, index=True)
    nombre = db.Column(db.String(120), nullable=False, default='Administrador General')
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'usuario': self.usuario,
            'nombre': self.nombre,
            'email': self.email,
            'role': 'admin',
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<Administrador {self.usuario} - {self.nombre}>'
