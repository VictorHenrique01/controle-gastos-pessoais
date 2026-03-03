from flask import Blueprint, request, jsonify, session
from models.despesa_model import (
    adicionar_despesa,
    obter_despesas_por_usuario,
    CategoriaDespesa,
    TipoDespesa,  # NOVO
    obter_despesa_por_id,
    remover_despesa
)
from models.despesa_model import atualizar_despesa as model_atualizar

despesa_bp = Blueprint("despesas", __name__)

@despesa_bp.route("/", methods=["POST"])
def criar_despesa():
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    dados = request.get_json()

    # 🔹 Agora inclui "tipo" como obrigatório
    campos_obrigatorios = ["descricao", "valor", "categoria", "data", "tipo"]

    if not all(campo in dados and dados[campo] for campo in campos_obrigatorios):
        return jsonify({"erro": "Todos os campos são obrigatórios."}), 400

    # 🔹 Validação de categoria e tipo
    try:
        CategoriaDespesa[dados["categoria"]]
        TipoDespesa[dados["tipo"]]
    except KeyError:
        return jsonify({"erro": "Categoria ou tipo inválido."}), 400

    dados["usuario_id"] = session["usuario_id"]

    nova_despesa = adicionar_despesa(dados)

    return jsonify(nova_despesa), 201


@despesa_bp.route("/", methods=["GET"])
def listar_despesas_usuario():
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    usuario_id = session["usuario_id"]
    despesas = obter_despesas_por_usuario(usuario_id)

    return jsonify(despesas)


@despesa_bp.route("/<int:despesa_id>", methods=["GET"])
def obter_despesa_especifica(despesa_id):
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    usuario_id = session["usuario_id"]
    despesa = obter_despesa_por_id(despesa_id, usuario_id)

    if despesa:
        return jsonify(despesa.to_dict())
    else:
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
        # 🔹 Validação opcional antes de atualizar
        if "categoria" in dados:
            CategoriaDespesa[dados["categoria"]]

        if "tipo" in dados:
            TipoDespesa[dados["tipo"]]

        despesa = model_atualizar(despesa_id, usuario_id, dados)

        if not despesa:
            return jsonify({"erro": "Despesa não encontrada."}), 404

        return jsonify(despesa.to_dict()), 200

    except KeyError:
        return jsonify({"erro": "Categoria ou tipo inválido."}), 400

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