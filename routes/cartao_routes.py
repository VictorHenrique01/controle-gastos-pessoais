# routes/cartao_routes.py
from flask import Blueprint, request, jsonify, session, render_template
from models.cartao_model import (
    CategoriaCompra,
    adicionar_compra,
    obter_compras_por_usuario,
    obter_compra_por_id,
    obter_fatura,
    obter_resumo,
    remover_compra,
    marcar_parcela_paga
)

cartao_bp = Blueprint("cartao", __name__)


# ─── Página ──────────────────────────────────────────────────────────────────

@cartao_bp.route("/")
def pagina_cartao():
    if "usuario_id" not in session:
        from flask import redirect, url_for
        return redirect(url_for('usuarios.pagina_login'))
    return render_template("cartao.html")


# ─── Compras ─────────────────────────────────────────────────────────────────

@cartao_bp.route("/compras/", methods=["POST"])
def criar_compra():
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    dados = request.get_json()

    campos_obrigatorios = ["descricao", "valor_total", "parcelas", "categoria",
                           "data_compra", "dia_vencimento"]

    if not all(campo in dados and dados[campo] for campo in campos_obrigatorios):
        return jsonify({"erro": "Todos os campos são obrigatórios."}), 400

    try:
        CategoriaCompra[dados["categoria"]]
    except KeyError:
        return jsonify({"erro": "Categoria inválida."}), 400

    try:
        parcelas = int(dados["parcelas"])
        if not (1 <= parcelas <= 12):
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"erro": "Número de parcelas inválido (1 a 12)."}), 400

    try:
        dia = int(dados["dia_vencimento"])
        if not (1 <= dia <= 28):
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"erro": "Dia de vencimento inválido (1 a 28)."}), 400

    try:
        nova_compra = adicionar_compra(dados, session["usuario_id"])
        return jsonify(nova_compra), 201
    except Exception as e:
        print("Erro ao criar compra:", e)
        return jsonify({"erro": "Erro interno ao registrar compra."}), 500


@cartao_bp.route("/compras/", methods=["GET"])
def listar_compras():
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    compras = obter_compras_por_usuario(session["usuario_id"])
    return jsonify(compras)


@cartao_bp.route("/compras/<int:compra_id>", methods=["DELETE"])
def excluir_compra(compra_id):
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    try:
        ok = remover_compra(compra_id, session["usuario_id"])
        if not ok:
            return jsonify({"erro": "Compra não encontrada."}), 404
        return jsonify({"mensagem": "Compra removida com sucesso."}), 200
    except Exception as e:
        print("Erro ao excluir compra:", e)
        return jsonify({"erro": "Erro interno ao excluir compra."}), 500


# ─── Fatura ───────────────────────────────────────────────────────────────────

@cartao_bp.route("/fatura/<int:ano>/<int:mes>", methods=["GET"])
def ver_fatura(ano, mes):
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    if not (1 <= mes <= 12):
        return jsonify({"erro": "Mês inválido."}), 400

    fatura = obter_fatura(session["usuario_id"], ano, mes)
    return jsonify(fatura)


# ─── Resumo (cards do topo) ───────────────────────────────────────────────────

@cartao_bp.route("/resumo/", methods=["GET"])
def ver_resumo():
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    resumo = obter_resumo(session["usuario_id"])
    return jsonify(resumo)


# ─── Parcelas ────────────────────────────────────────────────────────────────

@cartao_bp.route("/parcelas/<int:parcela_id>/pagar", methods=["PATCH"])
def pagar_parcela(parcela_id):
    if "usuario_id" not in session:
        return jsonify({"erro": "Acesso não autorizado"}), 401

    try:
        ok = marcar_parcela_paga(parcela_id, session["usuario_id"])
        if not ok:
            return jsonify({"erro": "Parcela não encontrada."}), 404
        return jsonify({"mensagem": "Parcela marcada como paga."}), 200
    except Exception as e:
        print("Erro ao marcar parcela:", e)
        return jsonify({"erro": "Erro interno ao atualizar parcela."}), 500