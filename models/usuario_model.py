from config import db
from werkzeug.security import generate_password_hash

# Define a classe do modelo de usuário
class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    senha = db.Column(db.String(255), nullable=False)

    def __repr__(self):
        return f'<Usuario {self.nome}>'

def cadastrar_usuario(dados):
    # Cria uma nova instância da classe Usuario
    novo_usuario = Usuario(
        nome=dados['nome'],
        email=dados['email'],
        senha=generate_password_hash(dados['senha'])
    )
    db.session.add(novo_usuario)
    db.session.commit()

    return {"mensagem": "Usuário cadastrado com sucesso"}


def obter_usuarios():
    # Retorna todos os usuários como uma lista de objetos
    usuarios = Usuario.query.all()
    
    # Converte a lista de objetos em uma lista de dicionários para jsonify
    lista_usuarios = [{"id": u.id, "nome": u.nome, "email": u.email} for u in usuarios]
    
    return lista_usuarios