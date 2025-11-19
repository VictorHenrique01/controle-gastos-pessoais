from flask import Blueprint, request, jsonify, session
from models.despesa_model import adicionar_despesa, obter_despesas_por_usuario, CategoriaDespesa, obter_despesa_por_id, remover_despesa
from models.despesa_model import atualizar_despesa as model_atualizar


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
    
@despesa_bp.route("/<int:despesa_id>", methods=["PATCH"])
def editar_despesa(despesa_id):
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    usuario_id = session["usuario_id"]
    dados = request.get_json() or {}

    if not dados:
        return jsonify({"erro": "Nenhum dado enviado."}), 400

    try:
        despesa = model_atualizar(despesa_id, usuario_id, dados)

        if not despesa:
            return jsonify({"erro": "Despesa não encontrada."}), 404

        return jsonify(despesa.to_dict()), 200

    except KeyError:
        return jsonify({"erro": "Categoria inválida."}), 400

    except Exception as e:
        print("Erro ao atualizar:", e)
        return jsonify({"erro": "Erro interno ao atualizar despesa."}), 500
    
@despesa_bp.route("/<int:despesa_id>", methods=["DELETE"])
def excluir_despesa(despesa_id):
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    usuario_id = session["usuario_id"]

    try:
        ok = remover_despesa(despesa_id, usuario_id)

        if not ok:
            return jsonify({"erro": "Despesa não encontrada."}), 404

        return jsonify({"mensagem": "Despesa excluída com sucesso."}), 200

    except Exception as e:
        print("Erro ao excluir:", e)
        return jsonify({"erro": "Erro interno ao excluir despesa."}), 500


    
