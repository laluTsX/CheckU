import os
import sys
from app import create_app
from extensions import db
from seeds.seeder import seed_database

def init():
    app = create_app()
    with app.app_context():
        print("[CheckU] Creando tablas de la base de datos CheckU...")
        db.create_all()
        print("[CheckU] [OK] Tablas creadas exitosamente.")
        seed_database()

if __name__ == '__main__':
    init()
