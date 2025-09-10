from flask_mysqldb import MySQL

mysql = MySQL()

def init_app(app):
    app.config['MYSQL_HOST'] = 'localhost'
    app.config['MYSQL_USER'] = 'root'
    app.config['MYSQL_PASSWORD'] = 'cavadinha'
    app.config['MYSQL_DB'] = 'controle_gastos'
    app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

    mysql.init_app(app)
