Backend FastAPI (Python) - AppGabinete

1. Copiar .env.example -> .env y rellenar DATABASE_URL con la URL de Supabase.
2. Instalar:
   pip install -r requirements.txt
3. Ejecutar en dev:
   uvicorn app.main:app --reload --host 0.0.0.0 --port 4000
4. Docs OpenAPI: http://localhost:4000/docs

Notas:
- Para producción usar Alembic o migraciones, y revisar timeouts/connection pooling.
- Ajusta los modelos si los CSV contienen campos adicionales.

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
[PLM 12/10/2025] CREAR UNA IMAGEN DE DOCKER CON EL BACKEND (teniendo ya un dockerfile)
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

1. Revisar el fichero Dockerfile donde se dan la imagen base y las instalaciones a realizar a partir del fichero requirements.txt del proyecto
      # 1.1) ir a la carpeta donde está el Dockerfile
      cd c:\DESARROLLO\AppGabinete\backend_python

      # 1.2) construir la imagen
      docker build -t appgabinete:latest .

               ASEGURAR NO COPIAR EN LA IMAGEN LOS ARCHIVOS QUE NO SE QUIERAN CON .dockerignore !!!!

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
[PLM 12/10/2025] EJECUTAR UN CONTENEDOR EN LOCAL CON LA IMAGEN CREADA
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

1. Una vez creada la imagen, ejecutar un contenedor pasandole los datos de las variables de entorno (fundamentalmente cadena de conexion a la bbdd)
   1.1. Pasandole directamente la url en una variable
      # Alternativa: pasar solo DATABASE_URL desde la variable de entorno de PowerShell
         docker run -d --name appgabinete -p 4000:4000 --env "DATABASE_URL=$env:DATABASE_URL" appgabinete:latest


   1.2. Pasandole los datos el fichero de .env (no se copia en el contenedor, por lo que no queda expuesto la pwd) 
      # ejecutar el contenedor en background usando un fichero .env (RECOMENDADO !!!)
               docker run -d --name appgabinete -p 4000:4000 --env-file .env appgabinete:latest
        
         # NOTA: para que funcione esta opcion he tenido que quitar las comillas en el valor de las variables

      # ejecutar en primer plano (útil para debugging)
               docker run --rm -it -p 4000:4000 --env-file .env appgabinete:latest

2. Si queremos entar en el contenedor en ejecucion para revisar algo
      # abrir shell dentro del contenedor en ejecución
         docker exec -it appgabinete /bin/sh

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
[PLM 13/10/2025] SUBIR LA IMAGEN A ARTIFACT REGISTRY 
(NO ES NECESARIO TENER LA IMAGEN YA CREADA, HAY UN PASO QUE HACE EL BUILD, PERO SI ESTA CREADA YA, SE PUEDE UTILIZAR)
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

1. Habilitar API de artifact Registry en GCP (si no esta ya habilitado)
   # bash
   gcloud services enable artifactregistry.googleapis.com cloudbuild.googleapis.com

2. Crear repositorio Docker en Artifact Registry (GCP) para la imagen que vamos a subir
   # bash
   gcloud artifacts repositories create REPO_NAME \
   --repository-format=docker \
   --location=REGION \
   --description="Docker images for AppGabinete"

   (utilizar la REGION que se quiere y dar un REPO_NAME que se elija)

   gcloud artifacts repositories create appgab --repository-format=docker --location=europe-southwest1 --description="Docker images for AppGabinete"

3. Autenticar el Docker (local) en GCP ¿¿¿¿DUDAS DE QUE HACE ESTO???
   # bash
   gcloud auth configure-docker
   # o limitar a host de Artifact Registry:
   gcloud auth configure-docker REGION-docker.pkg.dev

4. construir y push localmente 
   # bash (desde la carpeta donde esta el dockerfile - asegurar antes que Docker esta arrancado en la maquina local)
   #¿es necesario que tenga ese tag tan largo?
   docker build -t REGION-docker.pkg.dev/PROJECT_ID/REPO_NAME/appgabinete:latest .
   docker push REGION-docker.pkg.dev/PROJECT_ID/REPO_NAME/appgabinete:latest

      //SI YA HAY UNA IMAGEN CONSTRUIDA EN EL DOCKER LOCAL, NO ES NECESARIO ESTE PASO, PERO LA IMAGEN DEBE TENER LA RUTA ASI
      docker build -t europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabx:latest .  
      docker push europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabx:latest
   
   region: europe-southwest1
   project name: project-architecture-test1
   project id: project-architecture-test1
   project number: 32604191455
   repo_name: appgab

5. Desplegar en Cloud Run

      # bash
      gcloud run deploy appgabinete \
      --image  europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabinete:latest \
      --platform managed \
      --region europe-southwest1 \
      --allow-unauthenticated \
      # no usar esto porque el puerto ya lo asigna google
      # con cloud run no se puede mapear puerto a puerto, ç
      # en gcp se entra por el puerto por defecto y ya se asigna al que esta escuchando el contenedor 
      # --set-env-vars "PORT=4000" \
      -- port 4000
      --set-env-vars "DATABASE_URL=postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"


gcloud run deploy appgabinete --image  europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabx:latest --platform managed --region europe-southwest1 --allow-unauthenticated --port 4000 --set-env-vars "DATABASE_URL=postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"

      - EJECUTAR SIN SUBIR LA VARIABLE DE ENTORNO DATABASE_URL SI SE QUIERE QUE SE ACCEDA DESDE UN SECRET MANAGER
      - VER COMO MAPEAR EL SECRET AL HACER DEPLOY (si no da un error y hay que mapear a mano y hacer deploy otra vez)
                     USAR ESTO EN LUGAR DE --set-env-vars :    --set-secrets="[VARIABLE_DE_ENTORNO]=projects/[Project number]/secrets/[NOMBRE_DEL_SECRETO]:[VERSION]"   
                                                               --set-secrets="DATABASE_URL=projects/32604191455/secrets/appgab-db-pwd:latest"   

6. Probar 

https://appgabinete-32604191455.europe-southwest1.run.app/docs

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
[PLM 16/10/2025] INCLUIR LAS CREDENCIALES DE ACCESO A BBDD EN EL SECRET MANAGER DE GCP
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

1. Habilitar al API de Secret Manager

2. Crear el secreto 
   2.1. Por Consola
   2.2. Por comando: gcloud secrets create appgab-db-pwd --replication-policy="automatic"

3. Añadir la contraseña (o la url entera, segun como se tenga en el codigo) como una version del secreto 
      
      echo "postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres" | gcloud secrets versions add appgab-db-pwd --data-file=-

4. Configurar Cloud Run para acceder al secreto

   4.1. Asignar permisos a la cuenta de servicio de Compute Engine (cuenta formada con project_numer-compute@)

            gcloud projects add-iam-policy-binding TU_PROJECT_ID \
               --member="serviceAccount:$(gcloud projects describe TU_PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
               --role="roles/secretmanager.secretAccessor"

               gcloud projects add-iam-policy-binding project-architecture-test1 --member="serviceAccount:$(gcloud projects describe project-architecture-test1 --format='value(projectNumber)')-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
         
         Se puede hacer por consola, desde "Services Accounts"

         ES UNA MEJOR PRACTICA CREAR UNA CUENTA DE SERVICIO ESPECIFICA PARA LA APLICACION CON EL MINIMO PRIVILEGIO
   
   4.2. Mapear el secreto a una variable de entorno que utilice la aplicacion

         4.2.1. Se puede hacer desde la consola de GCP, desde la seccion "Variables y Secretos" de un servicio Cloud Run

                  Montar la contraseña como una variable de entorno + Asignar como nombre de la variable de entorno el que se utilice en el contenedor + Seleccionar el secreto y la version

         4.2.2. O con un comando
                  gcloud run deploy mi-servicio \
                     --image gcr.io/TU_PROJECT_ID/mi-imagen \
                     --set-secrets="/path/to/my/secret=mi-secreto-db-password:latest" \
                     --region europe-southwest1

5. Para usar el secreto en el contenedor, usarlo como una variable de entorno normal: getenvgetenv("DATABASE_URL")

            SI LA VARIABLE DE ENTORNO O SECRETO ES NECESARIA PARA QUE ARRANQUE EL SERVICIO, AL DEPLOY DE LA CLOUD RUN  (gcloud run deploy appgabinete --image...) DARA UN ERROR, SE CREARA LA CLOUD RUN PERO SIN DEPLOY. HAY QUE MAPEAR ENTONCES EL SECRET Y VOLVER A DEPLOY (por consola o por comandos)

            VER COMO MAPEAR EL SECRET A LA VEZ QUE SE HACE DEPLOY PARA NO TENER QUE HACER ESTE PASO POSTERIOR !!!!!
                     EN gcloud run deploy appgabinete --image... USAR ESTO EN LUGAR DE --set-env-vars :  
                                    --set-secrets="[VARIABLE_DE_ENTORNO]=projects/[PROJECT_NUMBER]/secrets/[NOMBRE_DEL_SECRETO]:[VERSION]"    
                                    
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
[PLM 17/10/2025] CONFIGURAR EL DEPLOY PARA QUE NO SEA DE ACCESO PUBLICO
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

1. Desplegar sin --allow-unauthenticated

      gcloud run deploy appgabinete --image  europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabx:latest --platform managed --region europe-southwest1 --port 4000 --set-env-vars "DATABASE_URL=postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"


      PREGUNTA AL DESPLEGAR SI SE QUIERE UNAUTHENTICATED MODE O NO: RESPONDER NO  -- ¡¡¡ VER COMO HACER DEPLOY SIN QUE PREGUNTE !!!

2. Para poder invocar al servicio de forma manual, hacer 2 pasos:

      2.1. Dar permisos de invocador a una identidad de Google (un correo):  
            2.1.1 Seleccionar servicio en Cloud Run
            2.1.2 Pestaña Permisos
            2.1.3 Agregar Principal: Insertar identidad con un correo (o cuenta de servicio) + Asignar role: Cloud Run Invoker
      2.2 Para usar el servicio es necesario:
            2.2.1 Generar un token para la identidad del Paso 1:  Autenticarse en GCP con la identidad adecuada + ejecutar $gcloud auth print-identity-token
            2.2.2 Utilizar el token (bearer token) obtenido en el paso 2.2.1 en el header de la llamada: --header 'Authorization:[TOKEN]' 

3. Para poder invocar al servicio desde otro servicio de GPC:

      - La cuenta de servicio que ejecuta el servicio llamante es la que tiene que tener los permisos Invoker en el servicio de cloud run
      - Con esta cuenta de servicio y las librerias de Google, se obtiene un token en el servicio llamante para poder hacer la llamada a la api igual que 2.2.2

4. Para poder invocar al servicio desde otro servicio externo:
      4.1. Crear una cuenta de servicio (en IAM - Cuentas de Servicio)
      4.2  Desde la Cloud Run - Permisos, asignar role Cloud Run Invoker
      4.3  Generar y descargar la clave JSON: 
            4.3.1 desde IAM - Cuentas de servicio, ir a la cuenta de servicio asociada con el Servicio
            4.3.2 Pestaña Claves + Crear Clave + Tipo JSON
            4.3.3 Se descarga un archivo que hay que utilizar en el servicio invocador  
      4.4 Para poder autenticar al serivicio que llama, hay que obtener un token asociado a la cuenta de servicio 
            4.4.1 obteniendo el token por medio de librerias de autenticacion de google + el archivo json descargado + variable de entorno GOOGLE_APPLICATION_CREDENTIALS
      4.4 Con el token obtenido, se hace una llamada como en el paso 2.2.2


SIGUIENTES PASOS

 . ver si al elimnar la imagen en Artifact Registry, sigue funcionando la Cloud Run
      SI QUE SIGUE FUNCIONANDO LA CLOUD RUN

 . Al hacer el build (local) ¿es necesario un tag tan largo?
      PARECE QUE SI ES NECESARIO PARA QUE PUEDA SUBIR LA IMAGEN (push) AL Artifact Registry DEL PROYECTO ADECUADO

 . NO pasar el secret en la url (lo coge de un gestor de secretos)  : DONE!!!!!

 . Securizar el contenedor (no publico)  -- DONE!!!
 
 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 [15/11/2025] CREAR AMBAS IMAGENES (FRONT Y BACK) CON EL COMPOSE Y CREANDO UNA RED
 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
1. MOVERSE A LA CARPETA DONDE ESTA EL ARCHIVO DOCKER-COMPOSE.YML
2. EJECUTAR: docker-compose up --build