# models/recorrencia_model.py
from db import db
from sqlalchemy import Enum
import enum
from datetime import datetime


class FrequenciaRecorrencia(enum.Enum):
    semanal = "semanal"
    mensal  = "mensal"
    anual   = "anual"


class Recorrencia(db.Model):
    __tablename__ = 'recorrencias'

    id          = db.Column(db.Integer, primary_key=True)
    frequencia  = db.Column(Enum(FrequenciaRecorrencia, name="frequencia_enum"), nullable=False)
    data_inicio = db.Column(db.Date, nullable=False)
    data_fim    = db.Column(db.Date, nullable=True)   # opcional
    criado_em   = db.Column(db.DateTime, default=datetime.utcnow)

    # Chave estrangeira para a despesa de origem
    despesa_id  = db.Column(db.Integer, db.ForeignKey('despesas.id'), nullable=False)
    despesa     = db.relationship('Despesa', backref='recorrencias')

    # Chave estrangeira para o usuário (facilita queries sem JOIN)
    usuario_id  = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    usuario     = db.relationship('Usuario', backref='recorrencias')

    def to_dict(self):
        return {
            "id":          self.id,
            "despesa_id":  self.despesa_id,
            "frequencia":  self.frequencia.name,
            "data_inicio": self.data_inicio.strftime('%Y-%m-%d'),
            "data_fim":    self.data_fim.strftime('%Y-%m-%d') if self.data_fim else None,
            "criado_em":   self.criado_em.strftime('%Y-%m-%d %H:%M:%S')
        }


# --- Funções que as rotas utilizam ---

def adicionar_recorrencia(dados):
    nova = Recorrencia(
        despesa_id  = int(dados['despesa_id']),
        frequencia  = FrequenciaRecorrencia[dados['frequencia']],
        data_inicio = datetime.strptime(dados['data_inicio'], '%Y-%m-%d').date(),
        data_fim    = datetime.strptime(dados['data_fim'], '%Y-%m-%d').date() if dados.get('data_fim') else None,
        usuario_id  = dados['usuario_id']
    )
    db.session.add(nova)
    db.session.commit()
    return nova.to_dict()


def obter_recorrencias_por_usuario(usuario_id):
    recorrencias = Recorrencia.query.filter_by(usuario_id=usuario_id).order_by(Recorrencia.data_inicio.asc()).all()
    return [r.to_dict() for r in recorrencias]


def remover_recorrencia(recorrencia_id, usuario_id):
    recorrencia = Recorrencia.query.filter_by(id=recorrencia_id, usuario_id=usuario_id).first()

    if not recorrencia:
        return False

    db.session.delete(recorrencia)
    db.session.commit()
    return True