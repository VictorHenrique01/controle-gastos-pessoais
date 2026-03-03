# models/despesa_model.py
from db import db
from sqlalchemy import Enum
import enum
from datetime import datetime

# Cria um tipo Enum para garantir que a categoria seja sempre uma das opções válidas
class CategoriaDespesa(enum.Enum):
    alimentacao = "Alimentação"
    transporte = "Transporte"
    lazer = "Lazer"
    moradia = "Moradia"
    outros = "Outros"

# NOVO: Enum para classificar a despesa como fixa ou variável
class TipoDespesa(enum.Enum):
    fixa = "fixa"
    variavel = "variavel"

class Despesa(db.Model):
    __tablename__ = 'despesas'
    id = db.Column(db.Integer, primary_key=True)
    descricao = db.Column(db.String(255), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    data = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    
    # Coluna de categoria usando o Enum
    categoria = db.Column(Enum(CategoriaDespesa, name="categoria_enum"), nullable=False)

    # NOVO: coluna de tipo usando o Enum
    tipo = db.Column(Enum(TipoDespesa, name="tipo_enum"), nullable=False)
    
    # Chave estrangeira para criar a relação com o usuário
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    
    # Relação de volta para o modelo Usuario
    usuario = db.relationship('Usuario', back_populates='despesas')

    # Função para converter o objeto em um dicionário (útil para o JSON)
    def to_dict(self):
        return {
            "id": self.id,
            "descricao": self.descricao,
            "valor": self.valor,
            "data": self.data.strftime('%Y-%m-%d'),
            "categoria": self.categoria.value,
            "tipo": self.tipo.name  # NOVO: retorna "fixa" ou "variavel"
        }

# --- Funções que as rotas utilizam ---

def adicionar_despesa(dados):
    nova_despesa = Despesa(
        descricao=dados['descricao'],
        valor=float(dados['valor']),
        data=datetime.strptime(dados['data'], '%Y-%m-%d').date(),
        categoria=CategoriaDespesa[dados['categoria']],
        tipo=TipoDespesa[dados['tipo']],  # NOVO
        usuario_id=dados['usuario_id']
    )
    db.session.add(nova_despesa)
    db.session.commit()
    return nova_despesa.to_dict()

def obter_despesas_por_usuario(usuario_id):
    despesas = Despesa.query.filter_by(usuario_id=usuario_id).order_by(Despesa.data.desc()).all()
    return [despesa.to_dict() for despesa in despesas]

def obter_despesa_por_id(despesa_id, usuario_id):
    return Despesa.query.filter_by(id=despesa_id, usuario_id=usuario_id).first()

def atualizar_despesa(despesa_id, usuario_id, dados):
    despesa = Despesa.query.filter_by(id=despesa_id, usuario_id=usuario_id).first()

    if not despesa:
        return None

    if "descricao" in dados:
        despesa.descricao = dados["descricao"]

    if "valor" in dados:
        despesa.valor = float(dados["valor"])

    if "data" in dados:
        despesa.data = datetime.strptime(dados["data"], "%Y-%m-%d").date()

    if "categoria" in dados:
        despesa.categoria = CategoriaDespesa[dados["categoria"]]

    # NOVO: permite alterar o tipo da despesa
    if "tipo" in dados:
        despesa.tipo = TipoDespesa[dados["tipo"]]

    db.session.commit()
    return despesa


def remover_despesa(despesa_id, usuario_id):
    despesa = Despesa.query.filter_by(id=despesa_id, usuario_id=usuario_id).first()

    if not despesa:
        return False

    db.session.delete(despesa)
    db.session.commit()
    return True