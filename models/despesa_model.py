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

class Despesa(db.Model):
    __tablename__ = 'despesas'
    id = db.Column(db.Integer, primary_key=True)
    descricao = db.Column(db.String(255), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    data = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    
    # Coluna de categoria usando o Enum
    categoria = db.Column(Enum(CategoriaDespesa, name="categoria_enum"), nullable=False)
    
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
            "data": self.data.strftime('%Y-%m-%d'), # Formata a data para o JSON
            "categoria": self.categoria.value # Pega o valor legível do Enum
        }

# --- Funções que as rotas utilizam ---

def adicionar_despesa(dados):
    nova_despesa = Despesa(
        descricao=dados['descricao'],
        valor=float(dados['valor']),
        data=datetime.strptime(dados['data'], '%Y-%m-%d').date(),
        categoria=CategoriaDespesa[dados['categoria']], # Converte a string da categoria para o tipo Enum
        usuario_id=dados['usuario_id']
    )
    db.session.add(nova_despesa)
    db.session.commit()
    return nova_despesa.to_dict()

def obter_despesas_por_usuario(usuario_id):
    despesas = Despesa.query.filter_by(usuario_id=usuario_id).order_by(Despesa.data.desc()).all()
    return [despesa.to_dict() for despesa in despesas]

def obter_despesa_por_id(despesa_id, usuario_id):
    # Garante que a despesa pertence ao usuário logado
    return Despesa.query.filter_by(id=despesa_id, usuario_id=usuario_id).first()