# models/cartao_model.py
from db import db
from sqlalchemy import Enum
import enum
from datetime import date, datetime
from dateutil.relativedelta import relativedelta


class CategoriaCompra(enum.Enum):
    alimentacao = "Alimentação"
    transporte  = "Transporte"
    lazer       = "Lazer"
    moradia     = "Moradia"
    outros      = "Outros"


class CompraCartao(db.Model):
    __tablename__ = 'compras_cartao'

    id               = db.Column(db.Integer, primary_key=True)
    descricao        = db.Column(db.String(255), nullable=False)
    valor_total      = db.Column(db.Float, nullable=False)
    parcelas         = db.Column(db.Integer, nullable=False, default=1)
    categoria        = db.Column(Enum(CategoriaCompra, name="categoria_compra_enum"), nullable=False)
    data_compra      = db.Column(db.Date, nullable=False)
    dia_vencimento   = db.Column(db.Integer, nullable=False)  # ex: 10
    criado_em        = db.Column(db.DateTime, default=datetime.utcnow)

    usuario_id       = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    usuario          = db.relationship('Usuario', backref='compras_cartao')

    # Relação com parcelas — cascade garante que ao deletar a compra,
    # todas as parcelas são deletadas automaticamente (sem erro de FK)
    parcelas_rel     = db.relationship(
        'ParcelaCartao',
        backref='compra',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )

    def to_dict(self):
        parcelas_pagas = self.parcelas_rel.filter_by(paga=True).count()
        return {
            "id":              self.id,
            "descricao":       self.descricao,
            "valor_total":     self.valor_total,
            "parcelas":        self.parcelas,
            "parcelas_pagas":  parcelas_pagas,
            "categoria":       self.categoria.name,
            "data_compra":     self.data_compra.strftime('%Y-%m-%d'),
            "dia_vencimento":  self.dia_vencimento,
            "criado_em":       self.criado_em.strftime('%Y-%m-%d %H:%M:%S')
        }


class ParcelaCartao(db.Model):
    __tablename__ = 'parcelas_cartao'

    id               = db.Column(db.Integer, primary_key=True)
    numero_parcela   = db.Column(db.Integer, nullable=False)   # 1, 2, 3...
    valor_parcela    = db.Column(db.Float, nullable=False)
    data_vencimento  = db.Column(db.Date, nullable=False)
    paga             = db.Column(db.Boolean, nullable=False, default=False)

    compra_id        = db.Column(db.Integer, db.ForeignKey('compras_cartao.id'), nullable=False)

    def to_dict(self):
        return {
            "id":              self.id,
            "compra_id":       self.compra_id,
            "numero_parcela":  self.numero_parcela,
            "valor_parcela":   self.valor_parcela,
            "data_vencimento": self.data_vencimento.strftime('%Y-%m-%d'),
            "paga":            self.paga
        }


# ─── Funções auxiliares ───────────────────────────────────────────────────────

def _calcular_vencimento(data_compra: date, numero_parcela: int, dia_vencimento: int) -> date:
    """
    Calcula a data de vencimento de cada parcela.
    Parcela 1 vence no próximo mês após a compra (ou no mesmo mês se
    a compra foi antes do dia de vencimento).
    """
    # Se a compra foi antes do dia de vencimento nesse mês,
    # a primeira parcela vence ainda nesse mês; caso contrário, no próximo.
    if data_compra.day < dia_vencimento:
        base = data_compra.replace(day=dia_vencimento)
    else:
        base = (data_compra + relativedelta(months=1)).replace(day=dia_vencimento)

    # Avança N-1 meses para as parcelas seguintes
    vencimento = base + relativedelta(months=numero_parcela - 1)
    return vencimento


def _gerar_parcelas(compra: CompraCartao) -> None:
    """Gera os registros de ParcelaCartao para uma CompraCartao recém-criada."""
    valor_parcela = round(compra.valor_total / compra.parcelas, 2)

    for i in range(1, compra.parcelas + 1):
        vencimento = _calcular_vencimento(compra.data_compra, i, compra.dia_vencimento)
        parcela = ParcelaCartao(
            compra_id       = compra.id,
            numero_parcela  = i,
            valor_parcela   = valor_parcela,
            data_vencimento = vencimento,
            paga            = False
        )
        db.session.add(parcela)


# ─── Funções que as rotas utilizam ───────────────────────────────────────────

def adicionar_compra(dados: dict, usuario_id: int) -> dict:
    compra = CompraCartao(
        descricao       = dados['descricao'],
        valor_total     = float(dados['valor_total']),
        parcelas        = int(dados['parcelas']),
        categoria       = CategoriaCompra[dados['categoria']],
        data_compra     = datetime.strptime(dados['data_compra'], '%Y-%m-%d').date(),
        dia_vencimento  = int(dados['dia_vencimento']),
        usuario_id      = usuario_id
    )
    db.session.add(compra)
    db.session.flush()   # gera o compra.id sem commit ainda
    _gerar_parcelas(compra)
    db.session.commit()
    return compra.to_dict()


def obter_compras_por_usuario(usuario_id: int) -> list:
    compras = (
        CompraCartao.query
        .filter_by(usuario_id=usuario_id)
        .order_by(CompraCartao.data_compra.desc())
        .all()
    )
    return [c.to_dict() for c in compras]


def obter_compra_por_id(compra_id: int, usuario_id: int):
    return CompraCartao.query.filter_by(id=compra_id, usuario_id=usuario_id).first()


def obter_fatura(usuario_id: int, ano: int, mes: int) -> dict:
    """
    Retorna todas as parcelas com vencimento no mês/ano informado,
    junto com o total da fatura.
    """
    data_inicio = date(ano, mes, 1)
    # último dia do mês
    data_fim = (data_inicio + relativedelta(months=1)) - relativedelta(days=1)

    parcelas = (
        ParcelaCartao.query
        .join(CompraCartao)
        .filter(
            CompraCartao.usuario_id == usuario_id,
            ParcelaCartao.data_vencimento >= data_inicio,
            ParcelaCartao.data_vencimento <= data_fim
        )
        .order_by(ParcelaCartao.data_vencimento.asc())
        .all()
    )

    total = round(sum(p.valor_parcela for p in parcelas), 2)

    return {
        "ano":     ano,
        "mes":     mes,
        "total":   total,
        "parcelas": [p.to_dict() for p in parcelas]
    }


def obter_resumo(usuario_id: int) -> dict:
    """
    Retorna os dados para os cards de resumo:
    - total comprometido no mês atual
    - total geral ainda a pagar (parcelas futuras não pagas)
    - total no próximo mês
    - quantidade de compras ativas (com parcelas não pagas)
    """
    hoje = date.today()
    proximo = hoje + relativedelta(months=1)

    fatura_mes     = obter_fatura(usuario_id, hoje.year, hoje.month)
    fatura_proximo = obter_fatura(usuario_id, proximo.year, proximo.month)

    # Total ainda a pagar (todas as parcelas não pagas do usuário)
    parcelas_abertas = (
        ParcelaCartao.query
        .join(CompraCartao)
        .filter(
            CompraCartao.usuario_id == usuario_id,
            ParcelaCartao.paga == False
        )
        .all()
    )
    total_aberto = round(sum(p.valor_parcela for p in parcelas_abertas), 2)

    # Compras com ao menos uma parcela não paga = ativas
    compras_ativas = (
        db.session.query(CompraCartao)
        .join(ParcelaCartao)
        .filter(
            CompraCartao.usuario_id == usuario_id,
            ParcelaCartao.paga == False
        )
        .distinct()
        .count()
    )

    return {
        "total_mes":        fatura_mes["total"],
        "total_proximo_mes": fatura_proximo["total"],
        "total_aberto":     total_aberto,
        "compras_ativas":   compras_ativas
    }


def remover_compra(compra_id: int, usuario_id: int) -> bool:
    compra = CompraCartao.query.filter_by(id=compra_id, usuario_id=usuario_id).first()
    if not compra:
        return False
    # cascade='all, delete-orphan' no relacionamento garante que
    # as parcelas são deletadas junto, sem erro de FK.
    db.session.delete(compra)
    db.session.commit()
    return True


def marcar_parcela_paga(parcela_id: int, usuario_id: int) -> bool:
    parcela = (
        ParcelaCartao.query
        .join(CompraCartao)
        .filter(
            ParcelaCartao.id == parcela_id,
            CompraCartao.usuario_id == usuario_id
        )
        .first()
    )
    if not parcela:
        return False
    parcela.paga = True
    db.session.commit()
    return True