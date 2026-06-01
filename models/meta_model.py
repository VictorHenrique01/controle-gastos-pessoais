# models/meta_model.py
from db import db
from sqlalchemy import Enum
import enum
from datetime import date, datetime


class StatusMeta(enum.Enum):
    ativa      = "ativa"
    concluida  = "concluida"
    cancelada  = "cancelada"


class Meta(db.Model):
    __tablename__ = 'metas'

    id              = db.Column(db.Integer, primary_key=True)
    titulo          = db.Column(db.String(255), nullable=False)
    descricao       = db.Column(db.String(500), nullable=True)
    valor_objetivo  = db.Column(db.Float, nullable=False)
    valor_acumulado = db.Column(db.Float, nullable=False, default=0.0)
    data_inicio     = db.Column(db.Date, nullable=False, default=date.today)
    data_prazo      = db.Column(db.Date, nullable=False)
    status          = db.Column(
        Enum(StatusMeta, name="status_meta_enum"),
        nullable=False,
        default=StatusMeta.ativa
    )
    criado_em       = db.Column(db.DateTime, default=datetime.utcnow)

    usuario_id      = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    usuario         = db.relationship('Usuario', backref='metas')

    # Histórico de aportes manuais
    historico       = db.relationship(
        'HistoricoMeta',
        backref='meta',
        cascade='all, delete-orphan',
        order_by='HistoricoMeta.data.desc()',
        lazy='dynamic'
    )

    # ─── Propriedades calculadas ─────────────────────────────
    @property
    def valor_restante(self):
        return max(0.0, round(self.valor_objetivo - self.valor_acumulado, 2))

    @property
    def percentual(self):
        if self.valor_objetivo <= 0:
            return 0.0
        return round(min(100.0, (self.valor_acumulado / self.valor_objetivo) * 100), 2)

    @property
    def meses_restantes(self):
        hoje = date.today()
        if self.data_prazo <= hoje:
            return 0
        delta_meses = (
            (self.data_prazo.year - hoje.year) * 12
            + (self.data_prazo.month - hoje.month)
        )
        return max(1, delta_meses)

    @property
    def aporte_mensal_necessario(self):
        """Valor médio mensal necessário para atingir a meta no prazo."""
        if self.meses_restantes == 0:
            return self.valor_restante
        return round(self.valor_restante / self.meses_restantes, 2)

    def to_dict(self):
        return {
            "id":                      self.id,
            "titulo":                  self.titulo,
            "descricao":               self.descricao,
            "valor_objetivo":          self.valor_objetivo,
            "valor_acumulado":         self.valor_acumulado,
            "valor_restante":          self.valor_restante,
            "percentual":              self.percentual,
            "aporte_mensal_necessario": self.aporte_mensal_necessario,
            "meses_restantes":         self.meses_restantes,
            "data_inicio":             self.data_inicio.strftime('%Y-%m-%d'),
            "data_prazo":              self.data_prazo.strftime('%Y-%m-%d'),
            "status":                  self.status.name,
            "criado_em":               self.criado_em.strftime('%Y-%m-%d %H:%M:%S')
        }


class HistoricoMeta(db.Model):
    """Registra cada aporte/ajuste na meta para compor o histórico de evolução."""
    __tablename__ = 'historico_metas'

    id          = db.Column(db.Integer, primary_key=True)
    meta_id     = db.Column(db.Integer, db.ForeignKey('metas.id'), nullable=False)
    valor       = db.Column(db.Float, nullable=False)        # pode ser positivo (aporte) ou negativo (ajuste)
    descricao   = db.Column(db.String(255), nullable=True)
    data        = db.Column(db.Date, nullable=False, default=date.today)
    criado_em   = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":        self.id,
            "meta_id":   self.meta_id,
            "valor":     self.valor,
            "descricao": self.descricao,
            "data":      self.data.strftime('%Y-%m-%d'),
        }


# ─── Funções que as rotas utilizam ───────────────────────────────────────────

def adicionar_meta(dados: dict, usuario_id: int) -> dict:
    meta = Meta(
        titulo         = dados['titulo'],
        descricao      = dados.get('descricao', None),
        valor_objetivo = float(dados['valor_objetivo']),
        valor_acumulado= float(dados.get('valor_acumulado', 0.0)),
        data_inicio    = datetime.strptime(dados['data_inicio'], '%Y-%m-%d').date(),
        data_prazo     = datetime.strptime(dados['data_prazo'], '%Y-%m-%d').date(),
        status         = StatusMeta.ativa,
        usuario_id     = usuario_id
    )
    db.session.add(meta)
    db.session.commit()
    return meta.to_dict()


def obter_metas_por_usuario(usuario_id: int) -> list:
    metas = (
        Meta.query
        .filter_by(usuario_id=usuario_id)
        .order_by(Meta.criado_em.desc())
        .all()
    )
    return [m.to_dict() for m in metas]


def obter_meta_por_id(meta_id: int, usuario_id: int):
    return Meta.query.filter_by(id=meta_id, usuario_id=usuario_id).first()


def atualizar_meta(meta_id: int, usuario_id: int, dados: dict):
    meta = Meta.query.filter_by(id=meta_id, usuario_id=usuario_id).first()
    if not meta:
        return None

    if "titulo" in dados:
        meta.titulo = dados["titulo"]
    if "descricao" in dados:
        meta.descricao = dados["descricao"]
    if "valor_objetivo" in dados:
        meta.valor_objetivo = float(dados["valor_objetivo"])
    if "data_prazo" in dados:
        meta.data_prazo = datetime.strptime(dados["data_prazo"], "%Y-%m-%d").date()
    if "status" in dados:
        meta.status = StatusMeta[dados["status"]]

    # Verifica automaticamente se meta foi concluída
    if meta.valor_acumulado >= meta.valor_objetivo:
        meta.status = StatusMeta.concluida

    db.session.commit()
    return meta


def registrar_aporte(meta_id: int, usuario_id: int, valor: float, descricao: str = None) -> dict:
    """
    Adiciona um aporte ao valor acumulado da meta e registra no histórico.
    Valor positivo = aporte. Valor negativo = correção/estorno.
    """
    meta = Meta.query.filter_by(id=meta_id, usuario_id=usuario_id).first()
    if not meta:
        return None

    meta.valor_acumulado = round(meta.valor_acumulado + valor, 2)

    # Garante que não fique negativo
    if meta.valor_acumulado < 0:
        meta.valor_acumulado = 0.0

    # Atualiza status automaticamente
    if meta.valor_acumulado >= meta.valor_objetivo:
        meta.status = StatusMeta.concluida
    elif meta.status == StatusMeta.concluida and meta.valor_acumulado < meta.valor_objetivo:
        meta.status = StatusMeta.ativa

    entrada = HistoricoMeta(
        meta_id   = meta_id,
        valor     = valor,
        descricao = descricao or ("Aporte" if valor > 0 else "Ajuste"),
        data      = date.today()
    )
    db.session.add(entrada)
    db.session.commit()
    return meta.to_dict()


def obter_historico(meta_id: int, usuario_id: int) -> list:
    meta = Meta.query.filter_by(id=meta_id, usuario_id=usuario_id).first()
    if not meta:
        return None
    return [h.to_dict() for h in meta.historico]


def remover_meta(meta_id: int, usuario_id: int) -> bool:
    meta = Meta.query.filter_by(id=meta_id, usuario_id=usuario_id).first()
    if not meta:
        return False
    # cascade='all, delete-orphan' remove o histórico junto
    db.session.delete(meta)
    db.session.commit()
    return True