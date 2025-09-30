# config.py
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'uma-chave-secreta-muito-forte'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # A URI padrão agora aponta para o serviço 'mysql' do Docker.
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI') or \
        'mysql+pymysql://root:cavadinha@mysql/controle_gastos'