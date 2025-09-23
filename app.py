from flask import Flask, render_template, session, redirect, url_for, flash
from routes.usuario_routes import usuario_bp
from config import init_app # Ou importe de db.py, de onde estiver sua função init_app

app = Flask(__name__)
app.config['SECRET_KEY'] = 'cavadinha'

# Inicializar banco
init_app(app)

# Registrar rotas de usuário
app.register_blueprint(usuario_bp, url_prefix="/usuarios")

# --- ROTAS PRINCIPAIS DA APLICAÇÃO ---

# Rota para a página de entrada do site
@app.route("/")
def index():
    # Se o usuário já estiver logado, leva para a página principal
    if "usuario_id" in session:
        return redirect(url_for('pagina_inicial'))
    # Se não, leva para a página de login
    return redirect(url_for('usuarios.pagina_login'))

# Rota para a página principal, que só pode ser acessada após o login
@app.route("/pagina_inicial")
def pagina_inicial():
# Verifica se o usuário está na sessão (logado)
    if "usuario_id" not in session:
        flash("Você precisa fazer login para acessar esta página.", "warning")
        return redirect(url_for('usuarios.pagina_login'))
    
    # Se estiver logado, renderiza a página principal
    nome_usuario = session.get("usuario_nome", "Usuário") # Pega o nome da sessão
    return render_template("pagina_inicial.html", nome=nome_usuario)


if __name__ == "__main__":
    app.run(debug=True)
