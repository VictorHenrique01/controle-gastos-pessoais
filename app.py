from flask import Flask, render_template, session, redirect, url_for
from flask_migrate import Migrate

from config import Config
from db import db

from models.usuario_model import Usuario
from models.despesa_model import Despesa
from models.orcamento_model import Orcamento
from models.recorrencia_model import Recorrencia
from models.cartao_model import CompraCartao, ParcelaCartao, CategoriaCompra

from routes.cartao_routes import cartao_bp
from routes.usuario_routes import usuario_bp
from routes.despesa_routes import despesa_bp
from routes.orcamento_routes import orcamento_bp
from routes.recorrencia_routes import recorrencia_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    db.init_app(app)
    migrate = Migrate(app, db)
    
    app.register_blueprint(usuario_bp, url_prefix="/usuarios")
    app.register_blueprint(despesa_bp, url_prefix="/despesas")
    app.register_blueprint(orcamento_bp, url_prefix="/orcamentos")
    app.register_blueprint(recorrencia_bp, url_prefix="/recorrencias")
    app.register_blueprint(cartao_bp, url_prefix="/cartao")

    @app.route("/")
    def index():
        # Renderiza a landing page diretamente.
        # Se o usuário já estiver logado, o template exibe o botão
        # "Controlar Despesas" via {% if session.get('usuario_id') %}.
        return render_template("pagina_inicial.html")

    @app.route("/pagina_inicial")
    def pagina_inicial():
        if "usuario_id" not in session:
            return redirect(url_for('usuarios.pagina_login'))
        
        nome_usuario = session.get("usuario_nome", "Usuário")
        return render_template("despesas.html", nome=nome_usuario)

    return app