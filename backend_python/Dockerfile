# Dockerfile para FastAPI + Uvicorn (producción)
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# dependencias del sistema necesarias para psycopg2 y builds
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential libpq-dev gcc curl && \
    rm -rf /var/lib/apt/lists/*

# copiar e instalar requirements
COPY requirements.txt .
RUN python -m pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# copiar código
COPY . .

# puerto por defecto (Fly usa PORT env)
ENV PORT=4000
EXPOSE 4000

# comando de arranque (no usar --reload en producción)
CMD ["sh", "-lc", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers"]