import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'checku-super-secret-key-2024')

    # MySQL Configuration (Base de Datos Oficial: cuu en MySQL/XAMPP)
    MYSQL_USER = os.environ.get('MYSQL_USER', 'root').strip()
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '').strip()
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost').strip()
    MYSQL_PORT = os.environ.get('MYSQL_PORT', '3306').strip()
    MYSQL_DB = os.environ.get('MYSQL_DB', 'cuu').strip()

    if MYSQL_PASSWORD:
        auth = f"{MYSQL_USER}:{MYSQL_PASSWORD}"
    else:
        auth = f"{MYSQL_USER}"

    SQLALCHEMY_DATABASE_URI = (
        os.environ.get('DATABASE_URL') or
        f"mysql+pymysql://{auth}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 280,
        "pool_pre_ping": True,
    }

    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'checku-jwt-secret-key-token-2024')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.environ.get('JWT_EXPIRATION_HOURS', 24)))

    # QR Session Defaults (in minutes)
    QR_EXPIRATION_MINUTES_DEFAULT = int(os.environ.get('QR_EXPIRATION_MINUTES', 10))


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
