# routes/meta_routes.py
from flask import Blueprint, request, jsonify, session, render_template
from models.meta_model import (
    StatusMeta,
    adicionar_meta,
    obter_metas_por_usuario,
    obter_meta_por_id,
    atualizar_meta,
    registrar_aporte,
    obter_historico,
    remover_meta
)

meta_bp = Blueprint("metas", __name__)


# ─── Página ──────────────────────────────────────────────────────────────────

@meta_bp.route("/")
def pagina_metas():
    if "usuario_id" not in session:
        from flask import redirect, url_for
        return redirect(url_for('usuarios.pagina_login'))
    return render_template("metas.html")


# ─── CRUD de metas ───────────────────────────────────────────────────────────

@meta_bp.route("/", methods=["POST"])
def criar_meta():
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    dados = request.get_json()

    campos_obrigatorios = ["titulo", "valor_objetivo", "data_inicio", "data_prazo"]
    if not all(campo in dados and dados[campo] for campo in campos_obrigatorios):
        return jsonify({"erro": "Campos obrigatórios: titulo, valor_objetivo, data_inicio, data_prazo."}), 400

    try:
        valor = float(dados["valor_objetivo"])
        if valor <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"erro": "Valor objetivo deve ser maior que zero."}), 400

    if dados["data_prazo"] <= dados["data_inicio"]:
        return jsonify({"erro": "A data de prazo deve ser posterior à data de início."}), 400

    try:
        nova_meta = adicionar_meta(dados, session["usuario_id"])
        return jsonify(nova_meta), 201
    except Exception as e:
        print("Erro ao criar meta:", e)
        return jsonify({"erro": "Erro interno ao criar meta."}), 500


@meta_bp.route("/", methods=["GET"])
def listar_metas():
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    metas = obter_metas_por_usuario(session["usuario_id"])
    return jsonify(metas)


@meta_bp.route("/<int:meta_id>", methods=["GET"])
def obter_meta(meta_id):
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    meta = obter_meta_por_id(meta_id, session["usuario_id"])
    if not meta:
        return jsonify({"erro": "Meta não encontrada."}), 404

    return jsonify(meta.to_dict())


@meta_bp.route("/<int:meta_id>", methods=["PATCH"])
def editar_meta(meta_id):
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    dados = request.get_json() or {}
    if not dados:
        return jsonify({"erro": "Nenhum dado enviado."}), 400

    try:
        if "valor_objetivo" in dados:
            valor = float(dados["valor_objetivo"])
            if valor <= 0:
                return jsonify({"erro": "Valor objetivo deve ser maior que zero."}), 400

        if "status" in dados:
            StatusMeta[dados["status"]]

        meta = atualizar_meta(meta_id, session["usuario_id"], dados)
        if not meta:
            return jsonify({"erro": "Meta não encontrada."}), 404

        return jsonify(meta.to_dict()), 200

    except KeyError:
        return jsonify({"erro": "Status inválido."}), 400
    except Exception as e:
        print("Erro ao editar meta:", e)
        return jsonify({"erro": "Erro interno ao editar meta."}), 500


@meta_bp.route("/<int:meta_id>", methods=["DELETE"])
def excluir_meta(meta_id):
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    try:
        ok = remover_meta(meta_id, session["usuario_id"])
        if not ok:
            return jsonify({"erro": "Meta não encontrada."}), 404
        return jsonify({"mensagem": "Meta removida com sucesso."}), 200
    except Exception as e:
        print("Erro ao remover meta:", e)
        return jsonify({"erro": "Erro interno ao remover meta."}), 500


# ─── Aportes ─────────────────────────────────────────────────────────────────

@meta_bp.route("/<int:meta_id>/aportes", methods=["POST"])
def fazer_aporte(meta_id):
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    dados = request.get_json()

    if "valor" not in dados or dados["valor"] is None:
        return jsonify({"erro": "Campo obrigatório: valor."}), 400

    try:
        valor = float(dados["valor"])
        if valor == 0:
            return jsonify({"erro": "O valor do aporte não pode ser zero."}), 400
    except (ValueError, TypeError):
        return jsonify({"erro": "Valor inválido."}), 400

    descricao = dados.get("descricao", None)

    try:
        meta = registrar_aporte(meta_id, session["usuario_id"], valor, descricao)
        if not meta:
            return jsonify({"erro": "Meta não encontrada."}), 404
        return jsonify(meta), 200
    except Exception as e:
        print("Erro ao registrar aporte:", e)
        return jsonify({"erro": "Erro interno ao registrar aporte."}), 500


# ─── Histórico ───────────────────────────────────────────────────────────────

@meta_bp.route("/<int:meta_id>/historico", methods=["GET"])
def ver_historico(meta_id):
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    historico = obter_historico(meta_id, session["usuario_id"])
    if historico is None:
        return jsonify({"erro": "Meta não encontrada."}), 404

    return jsonify(historico)