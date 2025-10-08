from db import db
from datetime import datetime

class Orcamento(db.Model):
    __tablename__ = 'orcamentos'

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    mes_referencia = db.Column(db.String(7), nullable=False, default=datetime.now().strftime("%Y-%m"))
    valor_orcamento = db.Column(db.Float, nullable=False)

    # relacionamento inverso (acesso pelo objeto usuario.orcamentos)
    usuario = db.relationship('Usuario', back_populates='orcamentos')

    def __repr__(self):
        return f'<Orcamento usuario_id={self.usuario_id}, mes={self.mes_referencia}, valor={self.valor_orcamento}>'

def definir_orcamento(usuario_id, valor):
    """Define ou atualiza o orçamento do mês atual para o usuário"""
    mes_atual = datetime.now().strftime("%Y-%m")

    orcamento_existente = Orcamento.query.filter_by(usuario_id=usuario_id, mes_referencia=mes_atual).first()

    if orcamento_existente:
        orcamento_existente.valor_orcamento = valor
    else:
        novo_orcamento = Orcamento(usuario_id=usuario_id, mes_referencia=mes_atual, valor_orcamento=valor)
        db.session.add(novo_orcamento)

    db.session.commit()
    return {"mensagem": "Orçamento definido com sucesso", "valor": valor}


def obter_orcamento(usuario_id):
    """Retorna o orçamento do mês atual e o total de despesas do usuário"""
    from models.despesa_model import Despesa  # import local p/ evitar dependência circular
    mes_atual = datetime.now().strftime("%Y-%m")

    orcamento = Orcamento.query.filter_by(usuario_id=usuario_id, mes_referencia=mes_atual).first()
    despesas = Despesa.query.filter_by(usuario_id=usuario_id).all()
    total_despesas = sum(d.valor for d in despesas)

    return {
        "orcamento": orcamento.valor_orcamento if orcamento else 0.0,
        "total_despesas": total_despesas
    }
