from flask import Blueprint, request, jsonify, session
from models.recorrencia_model import (
    adicionar_recorrencia,
    obter_recorrencias_por_usuario,
    remover_recorrencia,
    FrequenciaRecorrencia
)

recorrencia_bp = Blueprint("recorrencias", __name__)


@recorrencia_bp.route("/", methods=["POST"])
def criar_recorrencia():
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    dados = request.get_json()

    campos_obrigatorios = ["despesa_id", "frequencia", "data_inicio"]

    if not all(campo in dados and dados[campo] for campo in campos_obrigatorios):
        return jsonify({"erro": "Campos obrigatórios: despesa_id, frequencia, data_inicio."}), 400

    try:
        FrequenciaRecorrencia[dados["frequencia"]]
    except KeyError:
        return jsonify({"erro": "Frequência inválida. Use: semanal, mensal ou anual."}), 400

    dados["usuario_id"] = session["usuario_id"]

    nova_recorrencia = adicionar_recorrencia(dados)

    return jsonify(nova_recorrencia), 201


@recorrencia_bp.route("/", methods=["GET"])
def listar_recorrencias_usuario():
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    usuario_id = session["usuario_id"]
    recorrencias = obter_recorrencias_por_usuario(usuario_id)

    return jsonify(recorrencias)


@recorrencia_bp.route("/<int:recorrencia_id>", methods=["DELETE"])
def excluir_recorrencia(recorrencia_id):
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    usuario_id = session["usuario_id"]

    try:
        ok = remover_recorrencia(recorrencia_id, usuario_id)

        if not ok:
            return jsonify({"erro": "Recorrência não encontrada."}), 404

        return jsonify({"mensagem": "Recorrência removida com sucesso."}), 200

    except Exception as e:
        print("Erro ao excluir recorrência:", e)
        return jsonify({"erro": "Erro interno ao excluir recorrência."}), 500