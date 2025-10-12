# routes/orcamento_routes.py
from flask import Blueprint, request, jsonify, session
from models.orcamento_model import definir_orcamento, obter_orcamento

# Mude o nome do blueprint e o prefixo da URL para o PLURAL, para corresponder ao JS
orcamento_bp = Blueprint('orcamentos', __name__)

# A rota POST agora responderá em "/" (que, com o prefixo, se torna "/orcamentos/")
@orcamento_bp.route('/', methods=['POST'])
def rota_definir_orcamento():
    # 1. Obter o ID do usuário da SESSÃO (MUITO MAIS SEGURO)
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401
    usuario_id = session["usuario_id"]
    
    dados = request.get_json()
    valor = dados.get('valor')

    if valor is None:
        return jsonify({"erro": "O campo 'valor' é obrigatório"}), 400

    resultado = definir_orcamento(usuario_id, valor)
    return jsonify(resultado), 200


# A rota GET também responderá em "/" e usará a SESSÃO
@orcamento_bp.route('/', methods=['GET'])
def rota_obter_orcamento():
    # 1. Obter o ID do usuário da SESSÃO
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401
    usuario_id = session["usuario_id"]

    resultado = obter_orcamento(usuario_id)
    
    # O JS espera um objeto com a chave "valor", vamos ajustar a resposta
    return jsonify({"valor": resultado.get("orcamento", 0.0)}), 200