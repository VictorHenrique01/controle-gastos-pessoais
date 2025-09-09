from flask import Flask
from routes.usuario_routes import usuario_bp
from routes.despesa_routes import despesa_bp

app = Flask(__name__)

#registrar rotass
app.register_blueprint(usuario_bp, url_prefix="/usuarios")
app.register_blueprint(despesa_bp, url_prefix="/despesas")

if __name__ == "__main__":
    app.run(debug=True)
