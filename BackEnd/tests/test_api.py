import os
import sys
import unittest
from datetime import datetime, timedelta

# Set sqlite for testing
os.environ['USE_SQLITE'] = 'true'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from extensions import db
from config import TestConfig
from models.profesor import Profesor
from models.alumno import Alumno
from models.grupo import Grupo
from models.sesion_qr import SesionQR
from models.asistencia import Asistencia

class CheckUApiTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        # Seed minimal data
        self.prof = Profesor(matricula='DOC-001', nombre='Prof. Smith', email='smith@checku.edu')
        self.prof.set_password('Pass123!')
        db.session.add(self.prof)

        self.al1 = Alumno(matricula='A001', nombre='Alice Student', carrera='Software', email='a001@checku.edu')
        self.al2 = Alumno(matricula='A002', nombre='Bob Outsider', carrera='Design', email='a002@checku.edu')
        db.session.add_all([self.al1, self.al2])
        db.session.flush()

        self.grupo = Grupo(
            nombre_materia='Algorithms 101',
            codigo_grupo='ALG-101',
            profesor_id=self.prof.id,
            aula='Room 302',
            horario='Mon 09:00 - 11:00'
        )
        self.grupo.alumnos.append(self.al1) # al1 is enrolled, al2 is not
        db.session.add(self.grupo)
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_profesor_login(self):
        res = self.client.post('/api/auth/profesor/login', json={
            'matricula': 'DOC-001',
            'password': 'Pass123!'
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertIn('access_token', data)
        self.assertEqual(data['user']['role'], 'profesor')

    def test_alumno_login_without_password(self):
        # Alumno logins ONLY with matricula
        res = self.client.post('/api/auth/alumno/login', json={
            'matricula': 'A001'
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertIn('access_token', data)
        self.assertEqual(data['user']['matricula'], 'A001')

    def test_alumno_login_invalid_matricula(self):
        res = self.client.post('/api/auth/alumno/login', json={
            'matricula': 'NONEXISTENT'
        })
        self.assertEqual(res.status_code, 404)

    def test_generate_qr_and_scan_flow(self):
        # 1. Login prof
        login_res = self.client.post('/api/auth/profesor/login', json={
            'matricula': 'DOC-001',
            'password': 'Pass123!'
        })
        token = login_res.get_json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        # 2. Generate QR session
        gen_res = self.client.post('/api/qr/generar', json={
            'grupo_id': self.grupo.id,
            'minutos_vigencia': 15
        }, headers=headers)
        self.assertEqual(gen_res.status_code, 201)
        qr_data = gen_res.get_json()['sesion']
        token_qr = qr_data['token_qr']
        self.assertTrue(qr_data['qr_image'].startswith('data:image/png;base64,'))

        # 3. Alumno 1 scans QR (enrolled -> success)
        scan_res = self.client.post('/api/qr/escanear', json={
            'token_qr': token_qr,
            'matricula': 'A001'
        })
        self.assertEqual(scan_res.status_code, 201)
        self.assertTrue(scan_res.get_json()['success'])

        # 4. Alumno 1 tries to scan again (duplicate -> 409)
        dup_res = self.client.post('/api/qr/escanear', json={
            'token_qr': token_qr,
            'matricula': 'A001'
        })
        self.assertEqual(dup_res.status_code, 409)
        self.assertEqual(dup_res.get_json()['code'], 'ALREADY_REGISTERED')

        # 5. Alumno 2 tries to scan (not enrolled -> 403)
        not_enrolled_res = self.client.post('/api/qr/escanear', json={
            'token_qr': token_qr,
            'matricula': 'A002'
        })
        self.assertEqual(not_enrolled_res.status_code, 403)
        self.assertEqual(not_enrolled_res.get_json()['code'], 'NOT_ENROLLED')

        # 6. Check live attendance feed for session
        feed_res = self.client.get(f'/api/qr/sesion/{token_qr}/asistencias')
        self.assertEqual(feed_res.status_code, 200)
        feed_data = feed_res.get_json()
        self.assertEqual(feed_data['estadisticas']['total_registrados'], 1)
        self.assertEqual(feed_data['asistencias'][0]['alumno_matricula'], 'A001')

    def test_expired_qr_code(self):
        # Create expired session directly
        expired_session = SesionQR(
            grupo_id=self.grupo.id,
            token_qr='CHECKU-EXPIRED-TEST',
            fecha_creacion=datetime.utcnow() - timedelta(minutes=20),
            fecha_expiracion=datetime.utcnow() - timedelta(minutes=5),
            activo=True
        )
        db.session.add(expired_session)
        db.session.commit()

        scan_res = self.client.post('/api/qr/escanear', json={
            'token_qr': 'CHECKU-EXPIRED-TEST',
            'matricula': 'A001'
        })
        self.assertEqual(scan_res.status_code, 400)
        self.assertEqual(scan_res.get_json()['code'], 'QR_EXPIRED')

if __name__ == '__main__':
    unittest.main()
