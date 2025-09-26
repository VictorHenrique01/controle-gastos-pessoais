from config import db
from werkzeug.security import generate_password_hash, check_password_hash
# A importação do Despesa aqui é necessária apenas para o type hinting (opcional, mas bom)
from models.despesa_model import Despesa 

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    senha = db.Column(db.String(255), nullable=False)


    despesas = db.relationship('Despesa', back_populates='usuario', cascade="all, delete-orphan")

    def verificar_senha(self, senha_para_verificar):
        return check_password_hash(self.senha, senha_para_verificar)

    def __repr__(self):
        return f'<Usuario {self.nome}>'

def cadastrar_usuario(dados):
    novo_usuario = Usuario(
        nome=dados['nome'],
        email=dados['email'],
        senha=generate_password_hash(dados['senha'])
    )
    db.session.add(novo_usuario)
    db.session.commit()

    return {"mensagem": "Usuário cadastrado com sucesso"}

def obter_usuarios():
    usuarios = Usuario.query.all()
    lista_usuarios = [{"id": u.id, "nome": u.nome, "email": u.email} for u in usuarios]   
    return lista_usuarios

def obter_usuario_por_email(email):
    return Usuario.query.filter_by(email=email).first()