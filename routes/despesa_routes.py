from flask import Blueprint, request, jsonify, session
from models.despesa_model import adicionar_despesa, obter_despesas_por_usuario, CategoriaDespesa, obter_despesa_por_id 

despesa_bp = Blueprint("despesas", __name__)

@despesa_bp.route("/", methods=["POST"])
def criar_despesa():
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    dados = request.get_json()
    
    campos_obrigatorios = ["descricao", "valor", "categoria", "data"]
    if not all(campo in dados and dados[campo] for campo in campos_obrigatorios):
        return jsonify({"erro": "Todos os campos são obrigatórios."}), 400
        
    try:
        CategoriaDespesa[dados['categoria']]
    except KeyError:
        return jsonify({"erro": f"Categoria '{dados['categoria']}' inválida."}), 400

    dados["usuario_id"] = session["usuario_id"]
    nova_despesa = adicionar_despesa(dados)
    
    return jsonify(nova_despesa), 201

@despesa_bp.route("/", methods=["GET"])
def listar_despesas_usuario():
    # 1. Verificar se o usuário está logado
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401
    
    usuario_id = session["usuario_id"]
    
    # 2. Buscar as despesas do usuário logado
    despesas = obter_despesas_por_usuario(usuario_id)
    
    return jsonify(despesas)

@despesa_bp.route("/<int:despesa_id>", methods=["GET"])
def obter_despesa_especifica(despesa_id):
    # a. Verificar se o usuário está logado
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    usuario_id = session["usuario_id"]

    # b. Buscar a despesa no banco de dados usando a nova função
    despesa = obter_despesa_por_id(despesa_id, usuario_id)

    # c. Verificar se a despesa foi encontrada
    if despesa:
        # Se encontrou, retorna os dados da despesa
        return jsonify(despesa.to_dict())
    else:
        # Se não encontrou (ou não pertence ao usuário), retorna erro 404
        return jsonify({"erro": "Despesa não encontrada"}), 404