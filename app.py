from flask import Flask, render_template, session, redirect, url_for
from flask_migrate import Migrate

from config import Config
from db import db
from models.usuario_model import Usuario
from models.despesa_model import Despesa
from routes.usuario_routes import usuario_bp
from routes.despesa_routes import despesa_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    db.init_app(app)
    migrate = Migrate(app, db)
    
    app.register_blueprint(usuario_bp, url_prefix="/usuarios")
    app.register_blueprint(despesa_bp, url_prefix="/despesas")

    @app.route("/")
    def index():
        if "usuario_id" in session:
            return redirect(url_for('pagina_inicial'))
        return redirect(url_for('usuarios.pagina_login'))

    @app.route("/pagina_inicial")
    def pagina_inicial():
        if "usuario_id" not in session:
            return redirect(url_for('usuarios.pagina_login'))
        
        nome_usuario = session.get("usuario_nome", "Usuário")
        return render_template("despesas.html", nome=nome_usuario)

    return app