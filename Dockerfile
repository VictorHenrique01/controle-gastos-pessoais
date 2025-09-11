# Use uma imagem base oficial do Python
FROM python:3.10-slim-bookworm

# Define o diretório de trabalho para a pasta da sua aplicação
WORKDIR /app

# Copia o arquivo de requisitos
COPY requirements.txt .

# Instala as dependências do sistema
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    gcc \
    pkg-config \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Instala as dependências do Python
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código da sua aplicação para o diretório de trabalho
COPY . .

# Expõe a porta que o Gunicorn usará
EXPOSE 5000

# Comando para rodar a aplicação com Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "run:app"]