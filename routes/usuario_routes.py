from flask import Blueprint, request, jsonify, render_template
from models.usuario_model import cadastrar_usuario,obter_usuarios

usuario_bp = Blueprint("usuario", __name__)

@usuario_bp.route("/", methods=["POST"])
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