from flask import Flask
from routes.usuario_routes import usuario_bp
from config import init_app

app = Flask(__name__)

# Inicializar banco
init_app(app)

# Registrar rotas
app.register_blueprint(usuario_bp, url_prefix="/usuarios")
#app.register_blueprint(despesa_bp, url_prefix="/despesas")

if __name__ == "__main__":
    app.run(debug=True)
