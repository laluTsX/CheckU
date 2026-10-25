from extensions import db
from models.profesor import Profesor
from models.alumno import Alumno
from models.grupo import Grupo
from models.grupo_alumno import grupo_alumno
from models.sesion_qr import SesionQR
from models.asistencia import Asistencia
from models.administrador import Administrador
from models.justificante import Justificante

__all__ = [
    'db',
    'Profesor',
    'Alumno',
    'Grupo',
    'grupo_alumno',
    'SesionQR',
    'Asistencia',
    'Administrador',
    'Justificante'
]
