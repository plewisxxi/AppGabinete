# --- Fase 1: Build (si tuvieras un paso de compilación, iría aquí) ---
# Por ahora, tu frontend es estático, así que esta fase es simple.

# --- Fase 2: Producción ---
# Usamos una imagen oficial de Nginx como base. Es ligera y optimizada.
#FROM nginx:latest
FROM nginx:1.29.2-alpine-slim

# Etiqueta para identificar al mantenedor de la imagen
LABEL maintainer="Gemini Code Assist"

# Copiamos los archivos estáticos del frontend al directorio por defecto de Nginx
# Asumo que tienes un index.html y un style.css además de los .js
COPY ./index.html /usr/share/nginx/html/
COPY ./style.css /usr/share/nginx/html/
COPY ./app.js /usr/share/nginx/html/
COPY ./api.js /usr/share/nginx/html/
COPY ./ui.js /usr/share/nginx/html/

# Copiamos el script de entrada que configurará la URL del API
COPY ./entrypoint.sh /

# Damos permisos de ejecución al script
RUN chmod +x /entrypoint.sh

# Exponemos el puerto 80, que es el puerto por defecto de Nginx
EXPOSE 80

# Definimos el entrypoint para que se ejecute nuestro script antes de arrancar Nginx.
# Esto nos permite configurar la URL del API dinámicamente.
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
