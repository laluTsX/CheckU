import os
from app import create_app
from extensions import db

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() in ('true', '1', 't')
    with app.app_context():
        print(f"[CheckU] Base de datos activa: MySQL '{app.config.get('MYSQL_DB', 'cuu')}' en {app.config.get('MYSQL_HOST')}:{app.config.get('MYSQL_PORT')}")
    print(f"[CheckU] Servidor Backend listo en http://localhost:{port}")
    app.run(host=host, port=port, debug=debug)
