from flask_mysqldb import MySQL

mysql = MySQL()

def init_app(app):
    # Configurações do MySQL
    app.config['MYSQL_HOST'] = 'localhost'
    app.config['MYSQL_USER'] = 'root'         
    app.config['MYSQL_PASSWORD'] = 'RootSenha@123'
    app.config['MYSQL_DB'] = 'controle_gastos'
    app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

    # Inicializar o mysql
    mysql.init_app(app)
