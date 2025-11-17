#!/bin/sh
# entrypoint.sh

# Establece una URL por defecto si la variable de entorno no está definida
API_URL_VALUE=${API_URL:-http://localhost:4000/api}

echo "Configurando la URL del API a: $API_URL_VALUE"

# Busca el archivo api.js y reemplaza el marcador de posición.
# Usamos un delimitador diferente en sed (#) para evitar conflictos con las barras (/) en la URL.
sed -i "s#__API_URL__#$API_URL_VALUE#g" /usr/share/nginx/html/api.js

echo "Iniciando Nginx..."
# Ejecuta el comando original del contenedor (el CMD del Dockerfile)
exec "$@"
