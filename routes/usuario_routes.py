from flask import Blueprint, request, jsonify, render_template, redirect, url_for, flash, session
from models.usuario_model import cadastrar_usuario, obter_usuarios, obter_usuario_por_email, Usuario

usuario_bp = Blueprint("usuarios", __name__)

@usuario_bp.route("/cadastro", methods=["POST"])
def criar_usuario():
    dados = request.get_json()
    resultado = cadastrar_usuario(dados)
    return jsonify(resultado)

@usuario_bp.route("/", methods=["GET"])
def listar_usuarios():
    usuarios = obter_usuarios()
    return jsonify(usuarios)


@usuario_bp.route("/cadastro", methods=["GET"])
def pagina_cadastro():
    return render_template("cadastro_usuario.html")


@usuario_bp.route("/login", methods=["POST"])
def login():
    dados = request.get_json()
    email = dados.get("email")
    senha = dados.get("senha")

    usuario = obter_usuario_por_email(email)

    if usuario and usuario.verificar_senha(senha):
        session["usuario_id"] = usuario.id # guarda o id do usuário na sessão
        session["usuario_nome"] = usuario.nome
        return jsonify({"mensagem": "Login realizado com sucesso", "usuario": {"id": usuario.id, "nome": usuario.nome}})
    else:
        return jsonify({"erro": "Email ou senha incorretos"}), 401


@usuario_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"mensagem": "Logout realizado com sucesso"})