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
    # Se o método for POST, o usuário enviou o formulário
    if request.method == 'POST':
        email = request.form.get('email')
        senha = request.form.get('senha')

        # Busca o usuário no banco de dados pelo email
        usuario = obter_usuario_por_email(email)

        # Verifica se o usuário existe e se a senha está correta
        # Usamos a função 'verificar_senha' que criamos no modelo
        if usuario and usuario.verificar_senha(senha):
            # Se deu tudo certo, salvamos o ID do usuário na sessão
            session['user_id'] = usuario.id
            session['user_name'] = usuario.nome
            flash(f'Bem-vindo(a) de volta, {usuario.nome}!', 'success')
            # Redireciona para uma página principal (crie uma depois)
            return redirect(url_for('usuario.pagina_cadastro')) # Mude para uma rota de dashboard/home
        else:
            # Se as credenciais estiverem erradas, exibe uma mensagem de erro
            flash('Email ou senha inválidos. Tente novamente.', 'danger')
            return redirect(url_for('usuario.login'))

    # Se o método for GET, apenas exibe a página de login
    return render_template("login.html")


# ROTA DE LOGOUT
@usuario_bp.route('/logout')
def logout():
    # Remove os dados da sessão
    session.pop('user_id', None)
    session.pop('user_name', None)
    flash('Você saiu da sua conta.', 'info')
    return redirect(url_for('usuario.login'))