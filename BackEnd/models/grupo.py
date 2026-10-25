from datetime import datetime, date, timedelta
from extensions import db
from models.grupo_alumno import grupo_alumno

DIAS_MAP = {
    'lunes': 0,
    'martes': 1,
    'miercoles': 2,
    'miércoles': 2,
    'jueves': 3,
    'viernes': 4,
    'sabado': 5,
    'sábado': 5,
    'domingo': 6
}

class Grupo(db.Model):
    __tablename__ = 'grupos'

    id = db.Column(db.Integer, primary_key=True)
    nombre_materia = db.Column(db.String(120), nullable=False)
    codigo_grupo = db.Column(db.String(30), nullable=False)
    profesor_id = db.Column(db.Integer, db.ForeignKey('profesores.id', ondelete='CASCADE'), nullable=False)
    aula = db.Column(db.String(50), nullable=True, default='Aula General')
    horario = db.Column(db.String(150), nullable=False)
    
    # Cuatrimestre date fields (Max 4 months / 125 days)
    fecha_inicio = db.Column(db.Date, nullable=True)
    fecha_fin = db.Column(db.Date, nullable=True)
    dias_semana = db.Column(db.String(120), nullable=True)  # e.g. "Lunes,Miércoles"
    hora_inicio = db.Column(db.String(10), nullable=True)    # e.g. "08:00"
    hora_fin = db.Column(db.String(10), nullable=True)       # e.g. "10:00"
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    profesor = db.relationship('Profesor', back_populates='grupos')
    alumnos = db.relationship(
        'Alumno',
        secondary=grupo_alumno,
        back_populates='grupos',
        lazy='subquery'
    )
    sesiones_qr = db.relationship(
        'SesionQR',
        back_populates='grupo',
        lazy=True,
        cascade='all, delete-orphan'
    )
    justificantes = db.relationship(
        'Justificante',
        back_populates='grupo',
        lazy=True,
        cascade='all, delete-orphan'
    )

    def calcular_sesiones_planeadas(self):
        """
        Calculates all planned session dates and count for the cuatrimestre
        based on fecha_inicio, fecha_fin, and the scheduled weekdays.
        """
        if not self.fecha_inicio or not self.fecha_fin:
            # Fallback estimation if dates are not defined: return current sessions or default 32
            return {
                'total_planeadas': 32,
                'fechas': [],
                'duracion_dias': 120,
                'duracion_meses': 4.0
            }

        # Parse days to look for
        dias_objetivo = set()
        source_text = (self.dias_semana or self.horario or '').lower()
        for name, num in DIAS_MAP.items():
            if name in source_text:
                dias_objetivo.add(num)

        if not dias_objetivo:
            # Default to Lunes and Miercoles if none could be parsed
            dias_objetivo = {0, 2}

        cur_date = self.fecha_inicio
        end_date = self.fecha_fin
        fechas_planeadas = []

        # Prevent runaway loop if dates are invalid
        max_days = 200
        days_count = 0

        while cur_date <= end_date and days_count < max_days:
            if cur_date.weekday() in dias_objetivo:
                fechas_planeadas.append(cur_date.isoformat())
            cur_date += timedelta(days=1)
            days_count += 1

        duracion_dias = (self.fecha_fin - self.fecha_inicio).days + 1
        duracion_meses = round(duracion_dias / 30.5, 1)

        return {
            'total_planeadas': len(fechas_planeadas),
            'fechas': fechas_planeadas,
            'duracion_dias': duracion_dias,
            'duracion_meses': duracion_meses
        }

    def to_dict(self, include_alumnos=False):
        planeadas_info = self.calcular_sesiones_planeadas()
        total_planeadas = planeadas_info['total_planeadas']
        sesiones_impartidas = len(self.sesiones_qr) if self.sesiones_qr else 0
        sesiones_restantes = max(0, total_planeadas - sesiones_impartidas)
        avance_cuatrimestre = round((sesiones_impartidas / total_planeadas * 100), 1) if total_planeadas > 0 else 0

        # Maximum absences allowed to retain >= 80% attendance
        max_faltas_permitidas = int(total_planeadas * 0.20) if total_planeadas > 0 else 6

        data = {
            'id': self.id,
            'nombre_materia': self.nombre_materia,
            'codigo_grupo': self.codigo_grupo,
            'profesor_id': self.profesor_id,
            'profesor_nombre': self.profesor.nombre if self.profesor else '',
            'aula': self.aula,
            'horario': self.horario,
            'fecha_inicio': self.fecha_inicio.isoformat() if self.fecha_inicio else None,
            'fecha_fin': self.fecha_fin.isoformat() if self.fecha_fin else None,
            'dias_semana': self.dias_semana,
            'hora_inicio': self.hora_inicio,
            'hora_fin': self.hora_fin,
            'total_sesiones_planeadas': total_planeadas,
            'sesiones_impartidas': sesiones_impartidas,
            'sesiones_restantes': sesiones_restantes,
            'porcentaje_avance_cuatrimestre': avance_cuatrimestre,
            'max_faltas_permitidas': max_faltas_permitidas,
            'duracion_dias': planeadas_info['duracion_dias'],
            'duracion_meses': planeadas_info['duracion_meses'],
            'total_alumnos': len(self.alumnos),
            'total_justificantes': len(self.justificantes) if self.justificantes else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_alumnos:
            data['alumnos'] = [alumno.to_dict() for alumno in self.alumnos]
        return data

    def __repr__(self):
        return f'<Grupo {self.codigo_grupo} - {self.nombre_materia}>'
