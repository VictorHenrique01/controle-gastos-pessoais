from app import app
from config import db
from models.usuario_model import Usuario
from models.despesa_model import Despesa

def create_tables():
    with app.app_context():
        db.create_all()
        print("Tabelas criadas com sucesso!")

if __name__ == '__main__':
    create_tables()