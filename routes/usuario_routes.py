from flask import Blueprint, request, jsonify
from models.usuario_model import cadastrar_usuario

usuario_bp = Blueprint("usuario", __name__)

@usuario_bp.route("/", methods=["POST"])
def criar_usuario():
    dados = request.get_json()
    resultado = cadastrar_usuario(dados)
    return jsonify(resultado)
