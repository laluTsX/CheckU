import os
import click
from flask import Flask, jsonify
from flask_cors import CORS
import flask_migrate
from config import Config
from extensions import db, migrate, jwt

# Import blueprints
from controllers.auth_controller import auth_bp
from controllers.profesor_controller import profesor_bp
from controllers.qr_controller import qr_bp
from controllers.alumno_controller import alumno_bp
from controllers.admin_controller import admin_bp
from controllers.justificante_controller import justificante_bp


# Import models so Flask-Migrate and SQLAlchemy register them
import models

def register_cli_commands(app):
    @app.cli.command('init')
    @click.option('-d', '--directory', default='migrations', help='Directorio para las migraciones.')
    def cli_init(directory):
        """Inicializa el repositorio de migraciones para MySQL (alias de flask db init)."""
        target_db = app.config.get('MYSQL_DB', 'cuu')
        print(f"[CheckU] Inicializando repositorio de migraciones en '{directory}' para MySQL (BD: {target_db})...")
        try:
            flask_migrate.init(directory=directory)
            print("[CheckU] [OK] Repositorio de migraciones inicializado exitosamente.")
        except Exception as e:
            print(f"[CheckU] Aviso: {e}")

    @app.cli.command('migrate')
    @click.option('-m', '--message', default='migration', help='Mensaje descriptivo de la migración.')
    @click.option('-d', '--directory', default='migrations', help='Directorio de migraciones.')
    def cli_migrate(message, directory):
        """Genera archivos de migración comparando modelos con MySQL (alias de flask db migrate)."""
        target_db = app.config.get('MYSQL_DB', 'cuu')
        print(f"[CheckU] Generando migración con mensaje: '{message}' para MySQL (BD: {target_db})...")
        flask_migrate.migrate(directory=directory, message=message)
        print("[CheckU] [OK] Migración generada exitosamente en la carpeta migrations/.")

    @app.cli.command('upgrade')
    @click.option('-d', '--directory', default='migrations', help='Directorio de migraciones.')
    def cli_upgrade(directory):
        """Aplica las migraciones pendientes en MySQL cuu (alias de flask db upgrade)."""
        target_db = app.config.get('MYSQL_DB', 'cuu')
        print(f"[CheckU] Aplicando cambios y creando tablas en MySQL (BD: {target_db})...")
        flask_migrate.upgrade(directory=directory)
        print("[CheckU] [OK] Base de datos MySQL actualizada exitosamente.")

    @app.cli.command('seed')
    @click.argument('action', required=False)
    def cli_seed(action=None):
        """Siembra datos iniciales en MySQL cuu. Si se ejecuta 'flask seed run', también inicia el servidor."""
        from seeds.seeder import seed_database
        with app.app_context():
            seed_database()

        if action and action.lower() == 'run':
            from werkzeug.serving import run_simple
            print("\n[CheckU] Servidor iniciado en http://127.0.0.1:5000 (Presiona CTRL+C para detener)")
            run_simple('0.0.0.0', 5000, app, use_reloader=False, use_debugger=True)


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for Next.js web panel and React Native mobile clients
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Credentials"]
        }
    })

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Ensure tables exist in MySQL cuu
    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            print(f"[CheckU MySQL] Aviso al verificar tablas: {e}")

    # Register custom CLI commands (flask init, flask migrate, flask upgrade, flask seed)
    register_cli_commands(app)

    # JWT Error handlers
    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({
            'success': False,
            'code': 'UNAUTHORIZED',
            'message': 'Token de autenticación faltante o inválido.'
        }), 401

    @jwt.expired_token_loader
    def expired_token_response(jwt_header, jwt_payload):
        return jsonify({
            'success': False,
            'code': 'TOKEN_EXPIRED',
            'message': 'La sesión ha expirado. Por favor inicia sesión nuevamente.'
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return jsonify({
            'success': False,
            'code': 'INVALID_TOKEN',
            'message': 'Token inválido o corrupto.'
        }), 401

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(profesor_bp, url_prefix='/api/profesor')
    app.register_blueprint(qr_bp, url_prefix='/api/qr')
    app.register_blueprint(alumno_bp, url_prefix='/api/alumno')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(justificante_bp, url_prefix='/api/justificantes')

    # Root & Health Check Endpoints
    @app.route('/', methods=['GET'])
    def index():
        return jsonify({
            'app': 'CheckU Backend API',
            'database': app.config.get('MYSQL_DB', 'cuu'),
            'status': 'online',
            'endpoints': {
                'auth': '/api/auth',
                'admin': '/api/admin',
                'profesor': '/api/profesor',
                'qr': '/api/qr',
                'alumno': '/api/alumno',
                'justificantes': '/api/justificantes',
                'health': '/api/health'
            }
        }), 200


    @app.route('/api/health', methods=['GET'])
    def health_check():
        db_status = 'ok'
        try:
            db.session.execute(db.text('SELECT 1'))
        except Exception as e:
            db_status = f'error: {str(e)}'

        return jsonify({
            'status': 'healthy',
            'database_target': app.config.get('MYSQL_DB', 'cuu'),
            'database_connection': db_status
        }), 200

    return app

# Top-level instance for flask CLI command execution
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'  # CI: Bandit B201, debug solo si se pide
    app.run(host='0.0.0.0', port=port, debug=debug)
