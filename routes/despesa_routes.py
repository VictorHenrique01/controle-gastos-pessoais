from flask import Blueprint, request, jsonify, session
from models.despesa_model import adicionar_despesa, obter_despesas_por_usuario, CategoriaDespesa

despesa_bp = Blueprint("despesas", __name__)

@despesa_bp.route("/", methods=["POST"])
def criar_despesa():
    # 1. Verificar se o usuário está logado
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    # 2. Obter os dados da requisição
    dados = request.get_json()
    usuario_id = session["usuario_id"]

    # 3. Validar os dados recebidos
    campos_obrigatorios = ["descricao", "valor", "categoria"]
    if not all(campo in dados for campo in campos_obrigatorios):
        return jsonify({"erro": "Campos obrigatórios ausentes"}), 400
        
    # Validar se a categoria é uma das opções válidas
    try:
        CategoriaDespesa(dados['categoria'])
    except ValueError:
        return jsonify({"erro": f"Categoria '{dados['categoria']}' inválida."}), 400

    # 4. Adicionar o ID do usuário aos dados e salvar
    dados["usuario_id"] = usuario_id
    nova_despesa = adicionar_despesa(dados)
    
    return jsonify(nova_despesa), 201 # 201 Created

@despesa_bp.route("/", methods=["GET"])
def listar_despesas_usuario():
    # 1. Verificar se o usuário está logado
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401
    
    usuario_id = session["usuario_id"]
    
    # 2. Buscar as despesas do usuário logado
    despesas = obter_despesas_por_usuario(usuario_id)
    
    return jsonify(despesas)