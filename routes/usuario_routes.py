from flask import Blueprint, request, jsonify, render_template, redirect, url_for, flash, session
from models.usuario_model import cadastrar_usuario, obter_usuarios, obter_usuario_por_email, Usuario

usuario_bp = Blueprint("usuarios", __name__)

@usuario_bp.route("/", methods=["POST"])
def criar_usuario():
    dados = request.get_json()
    resultado = cadastrar_usuario(dados)
    return jsonify(resultado)

@usuario_bp.route("/", methods=["GET"])
def listar_usuarios():
    usuarios = obter_usuarios()
    return jsonify(usuarios)

#@usuario_bp.route("/cadastro", methods=["GET"])
#def pagina_cadastro():
#    return render_template("cadastro_usuario.html")

# ROTA DE LOGIN
@usuario_bp.route("/login", methods=["GET", "POST"])
def login():

    if request.method == 'POST':
        email = request.form.get('email')
        senha = request.form.get('senha')

        usuario = obter_usuario_por_email(email)

        if usuario and usuario.verificar_senha(senha):
            session['user_id'] = usuario.id
            session['user_name'] = usuario.nome
            flash(f'Bem-vindo(a) de volta, {usuario.nome}!', 'success')
            return redirect(url_for('usuario.pagina_cadastro')) 
        else:
            flash('Email ou senha inválidos. Tente novamente.', 'danger')
            return redirect(url_for('usuario.login'))

    return render_template("login.html")


# ROTA DE LOGOUT
@usuario_bp.route('/logout')
def logout():
    # Remove os dados da sessão
    session.pop('user_id', None)
    session.pop('user_name', None)
    flash('Você saiu da sua conta.', 'info')
    return redirect(url_for('usuario.login'))