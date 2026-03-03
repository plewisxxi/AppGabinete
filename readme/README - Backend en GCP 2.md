🚀 Guía de Despliegue: Backend en Google Cloud Platform

Este documento detalla el proceso para subir imágenes de Docker a Artifact Registry, desplegar en Cloud Run y gestionar la seguridad mediante Secret Manager.

📋 Requisitos PreviosAntes de comenzar

Asegúrate de tener instalada la Google Cloud CLI y Docker corriendo en tu máquina local.ParámetroValor de ejemploID del Proyectoproject-architecture-test1Regióneurope-southwest1Nombre del RepoappgabPuerto App40001. Configuración del Repositorio (Artifact Registry)Primero, habilitamos los servicios necesarios y creamos el repositorio donde vivirán nuestras imágenes.Bash# 1. Habilitar APIs necesarias
gcloud services enable artifactregistry.googleapis.com cloudbuild.googleapis.com

# 2. Crear el repositorio Docker
gcloud artifacts repositories create appgab \
    --repository-format=docker \
    --location=europe-southwest1 \
    --description="Docker images for AppGabinete"

# 3. Configurar Docker local para autenticarse con GCP
gcloud auth configure-docker europe-southwest1-docker.pkg.dev
2. Construcción y Envío de la ImagenPara que GCP pueda identificar la imagen, el Tag debe seguir el formato oficial de Artifact Registry.Bash# Construir la imagen localmente
docker build -t europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabx:latest .

# Subir la imagen al registro de GCP
docker push europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabx:latest
Nota técnica: El tag largo es obligatorio para que docker push sepa exactamente a qué proyecto y región debe enviar los datos.3. Gestión de Secretos (Secret Manager)Es una mala práctica exponer la DATABASE_URL en texto plano. Utilizaremos Secret Manager.Crear el secretoBash# 1. Crear el contenedor del secreto
gcloud secrets create appgab-db-pwd --replication-policy="automatic"

# 2. Añadir el valor (URL de conexión)
echo "postgresql://usuario:password@host:puerto/db" | \
gcloud secrets versions add appgab-db-pwd --data-file=-
Configurar Permisos de AccesoPara que Cloud Run pueda leer el secreto, la cuenta de servicio de Compute Engine debe tener permisos:Bashgcloud projects add-iam-policy-binding project-architecture-test1 \
    --member="serviceAccount:32604191455-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
4. Despliegue en Cloud RunDesplegamos la aplicación vinculando el secreto directamente como una variable de entorno.Despliegue Privado (Recomendado)Bashgcloud run deploy appgabinete \
  --image europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabx:latest \
  --platform managed \
  --region europe-southwest1 \
  --port 4000 \
  --no-allow-unauthenticated \
  --set-secrets="DATABASE_URL=projects/32604191455/secrets/appgab-db-pwd:latest"
Tip de puerto: En Cloud Run no se mapean puertos (como -p 80:4000). Solo indicas en qué puerto escucha tu contenedor (--port 4000) y Google se encarga del resto.5. Acceso y Seguridad¿Cómo invocar el servicio si es privado?Si has desplegado con --no-allow-unauthenticated, el servicio no responderá a peticiones públicas.Asignar rol de Invocador: En la consola de GCP, añade a tu usuario el rol Cloud Run Invoker.Generar Token de acceso:Bashexport TOKEN=$(gcloud auth print-identity-token)
Llamar a la API:Bashcurl -H "Authorization: Bearer $TOKEN" https://appgabinete-32604191455.europe-southwest1.run.app/docs
✅ Checklist de Estado (QA)[x] ¿Secreto implementado? Sí, mediante Secret Manager.[x] ¿Contenedor seguro? Sí, acceso no público configurado.[x] ¿Persistencia? Confirmado: eliminar la imagen en Artifact Registry no afecta a la instancia de Cloud Run que ya está en ejecución.[ ] ¿Cuenta de servicio dedicada? Pendiente crear una específica con privilegios mínimos (Best Practice).