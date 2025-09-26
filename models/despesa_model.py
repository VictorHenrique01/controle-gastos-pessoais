import enum
from config import db
from datetime import date

# Usamos Enum para garantir a integridade dos dados da categoria
class CategoriaDespesa(enum.Enum):
    ALIMENTACAO = "Alimentação"
    TRANSPORTE = "Transporte"
    LAZER = "Lazer"
    MORADIA = "Moradia"
    OUTROS = "Outros"

class Despesa(db.Model):
    __tablename__ = 'despesas'
    id = db.Column(db.Integer, primary_key=True)
    descricao = db.Column(db.String(255), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    data = db.Column(db.Date, nullable=False, default=date.today)
    
    # Coluna de categoria usando o Enum
    categoria = db.Column(db.Enum(CategoriaDespesa), nullable=False)
    
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)

    # Ajuste aqui para usar back_populates em vez de backref
    usuario = db.relationship('Usuario', back_populates='despesas')

    def to_dict(self):
        """Converte o objeto Despesa para um dicionário."""
        return {
            "id": self.id,
            "descricao": self.descricao,
            "valor": self.valor,
            "data": self.data.strftime('%Y-%m-%d'), # Formata a data para a resposta JSON
            "categoria": self.categoria.value, # Pega o valor do Enum (ex: "Alimentação")
            "usuario_id": self.usuario_id
        }

def adicionar_despesa(dados):
    """Cria e salva uma nova despesa no banco de dados."""
    nova_despesa = Despesa(
        descricao=dados['descricao'],
        valor=dados['valor'],
        categoria=CategoriaDespesa(dados['categoria']), # Converte a string em Enum
        usuario_id=dados['usuario_id']
    )
    # A data é definida por padrão se não for enviada
    if 'data' in dados:
        nova_despesa.data = date.fromisoformat(dados['data'])

    db.session.add(nova_despesa)
    db.session.commit()
    return nova_despesa.to_dict()

def obter_despesas_por_usuario(usuario_id):
    """Busca todas as despesas de um usuário específico."""
    despesas = Despesa.query.filter_by(usuario_id=usuario_id).order_by(Despesa.data.desc()).all()
    return [d.to_dict() for d in despesas]