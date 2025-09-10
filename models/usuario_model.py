from config import mysql
from werkzeug.security import generate_password_hash

def cadastrar_usuario(dados):
    nome = dados['nome']
    email = dados['email']
    senha = generate_password_hash(dados['senha'])

    cursor = mysql.connection.cursor()
    cursor.execute(
        "INSERT INTO usuarios (nome, email, senha) VALUES (%s, %s, %s)",
        (nome, email, senha)
    )
    mysql.connection.commit()
    cursor.close()

    return {"mensagem": "Usuário cadastrado com sucesso"}
