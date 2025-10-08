from flask import Blueprint, request, jsonify
from models.orcamento_model import definir_orcamento, obter_orcamento

orcamento_bp = Blueprint('orcamento', __name__)

@orcamento_bp.route('/orcamento', methods=['POST'])
def rota_definir_orcamento():
    dados = request.get_json()
    usuario_id = dados.get('usuario_id')
    valor = dados.get('valor')

    if not usuario_id or not valor:
        return jsonify({"erro": "Campos obrigatórios ausentes"}), 400

    resultado = definir_orcamento(usuario_id, valor)
    return jsonify(resultado), 200


@orcamento_bp.route('/orcamento/<int:usuario_id>', methods=['GET'])
def rota_obter_orcamento(usuario_id):
    resultado = obter_orcamento(usuario_id)
    return jsonify(resultado), 200
