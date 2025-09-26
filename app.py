from flask import Flask, render_template, session, redirect, url_for, flash
from routes.usuario_routes import usuario_bp
from routes.despesa_routes import despesa_bp # <-- 1. IMPORTE O NOVO BLUEPRINT
from config import init_app 

app = Flask(__name__)
app.config['SECRET_KEY'] = 'cavadinha'

# Inicializar banco
init_app(app)

# Registrar rotas de usuário
app.register_blueprint(usuario_bp, url_prefix="/usuarios")

# <-- 2. REGISTRE O BLUEPRINT DE DESPESAS
app.register_blueprint(despesa_bp, url_prefix="/despesas")

# --- ROTAS PRINCIPAIS DA APLICAÇÃO ---

# ... (o resto do seu código app.py permanece o mesmo) ...

@app.route("/")
def index():
    if "usuario_id" in session:
        return redirect(url_for('pagina_inicial'))
    return redirect(url_for('usuarios.pagina_login'))

@app.route("/pagina_inicial")
def pagina_inicial():
    if "usuario_id" not in session:
        flash("Você precisa fazer login para acessar esta página.", "warning")
        return redirect(url_for('usuarios.pagina_login'))
    
    nome_usuario = session.get("usuario_nome", "Usuário") 
    return render_template("pagina_inicial.html", nome=nome_usuario)


if __name__ == "__main__":
    app.run(debug=True)