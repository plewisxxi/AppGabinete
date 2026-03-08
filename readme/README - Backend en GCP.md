
## TAREA 0: PASOS PREVIOS

### 0.1 Autenticación en GCP

Puedes autenticarte previamente con el comando

```bash
gcloud auth login
```
¿Qué sucede después?
 1. Se abrirá automáticamente una ventana en tu navegador web.
 1. Seleccionas tu cuenta de Google.
 1. Concedes los permisos necesarios.
 1. ¡Listo! Tu terminal ahora tiene "permiso" para actuar en tu nombre.


### 0.2 Configuración completa (alternativa al login estandar)

Si es la primera vez que instalas gcloud o quieres configurar un perfil nuevo (con proyecto y región por defecto), usa: 

```bash
gcloud init 
```

Este comando es más completo porque, además de loguearte, te guía para:

* Seleccionar el proyecto de Google Cloud en el que vas a trabajar.
* Configurar la zona o región geográfica predeterminada.

### 0.3 Otra opción son las Credenciales para Desarrollo (ADC)

Si estás programando una aplicación (en Python, Node.js, Go, etc.) y quieres que tu código use tus credenciales personales para probar servicios como Storage o BigQuery localmente, necesitas este comando adicional: 

```bash
gcloud auth application-default login
```

Esto crea un archivo de credenciales por separado que las librerías de Google buscan automáticamente. Es fundamental si eres desarrollador.

### 0.4 Resumen de comandos de login útiles

|Acción|Comando|Comentarios|
|------|-------|-----------|
|**Login básico**|gcloud auth login||
|**Configurar todo (Project/Region)**|gcloud init||
|**Ver qué cuenta está activa**|gcloud auth list|cuenta activa muestra asterisco||
|**Cerrar sesión**|gcloud auth revoke||
|**Ver la configuracion completa**|gcloud config list|usuario activo + proyecto actual|


[PLM 13/10/2025] 
## TAREA 1: SUBIR LA IMAGEN A ARTIFACT REGISTRY 


(NO ES NECESARIO TENER LA IMAGEN YA CREADA, HAY UN PASO QUE HACE EL BUILD, PERO SI ESTA CREADA YA, SE PUEDE UTILIZAR)


### 1.1 Habilitar en GCP Artifact Registry API y Cloud Build API  

Habilitar ambas API, si no estan ya habilitadas, para hacer un build y tener un repositorio para subir la imagen (¿por medido de los comandos de gcloud?)

   ```bash
   # bash
   gcloud services enable artifactregistry.googleapis.com cloudbuild.googleapis.com
   ```

Si no estas autenticado ya, te pedirá las credenciales

Validar si los servicios estan habilitados:

```bash
# filtrando los enabled, todos (si no aparece en la lista, no está habilitado)
gcloud services list --enabled

# filtrando los enabled y ciertos servicios
gcloud services list --enabled --filter="name:artifactregistry.googleapis.com OR name:cloudbuild.googleapis.com"
```

### 1.2 Crear repositorio en Artifact Registry (GCP) 

En el repositorio creado es donde se va alojar la imagen docker que vamos a crear y a subir. Esta imagen se desplegará posteriormente en Cloud Run.

   ```bash
   # plantilla
   gcloud artifacts repositories create REPO_NAME \
   --repository-format=docker \
   --location=REGION \
   --description="Docker images for MiAPlicacion"
   ```

Valores de los parámetros a aplicar:
 * REGION: *europe-southwest1*
 * REPO_NAME: *appgab*

```bash
gcloud artifacts repositories create appgab --repository-format=docker --location=europe-southwest1 --description="Docker images for AppGabinete"
```


>NOTAS
>---
>* Puedes listar los repositorios que existen con el comando: *gcloud artifacts repositories list*
>* Para ver mas detalles de los repositorios existentes: *gcloud artifacts repositories list --format=yaml* 
>* Para eliminar un repositorio: *gcloud artifacts repositories delete REPO_NAME --location=REGION* 

### 1.3 Autenticar el Docker (local) en GCP 

En este paso se trata de configurar el Docker local para que pueda conectar con la infraestructura de Google Cloud, ya que la construcción de la imagen inicialmente se realiza en local y después se sube a GCP.

   ```bash
   gcloud auth configure-docker
   ```

   o limitar a host de Artifact Registry:

   ```bash
   gcloud auth configure-docker REGION-docker.pkg.dev
   ```

El primer comando es el "puente" que conecta tu instalación local de Docker con la infraestructura de Google Cloud. En términos simples: Configura Docker para que pueda entrar a los registros de Google (Artifact Registry o Container Registry) usando tus credenciales de gcloud automáticamente.

El segundo comando es para limitar la autenticación solo a una region específica de Artifact Registry. En este caso, la región es *europe-southwest1*. ¿Es necesario para Artifact Registry? SI ES ASI, ELIMINAR LA DOCUMENTACION DEL OTRO

>NOTAS
>---
>Lo que hace es:
>
>**1. Modifica tu archivo config.json**
>Cuando ejecutas el comando, gcloud busca el archivo de configuración de Docker en tu máquina (normalmente en ~/.docker/config.json en Linux/Mac o %USERPROFILE%\.docker\config.json en Windows).
>
>Lo que hace es añadir una sección llamada credHelpers. Se ve algo así:
>
>```JSON
>{
>  "credHelpers": {
>    "gcr.io": "gcloud",
>    "us-central1-docker.pkg.dev": "gcloud"
>  }
>}
>```
>
>**2. Establece un "Ayudante de Credenciales" (Credential Helper)**
>
>En lugar de guardar una contraseña estática (lo cual es inseguro), le dice a Docker: "Oye, cada vez que intentes hacer un docker push o docker pull a una dirección de Google, no me pidas contraseña a mí; pregúntale al comando gcloud por un token temporal".
>
>**3. ¿Por qué es importante?**
>
>* Seguridad: No tienes que manejar archivos de llaves JSON o contraseñas largas manualmente.
>* Comodidad: Una vez que haces gcloud auth login, Docker "hereda" ese acceso automáticamente.
>* Tokens de corta duración: Los tokens de acceso que genera expiran rápido, lo que reduce riesgos si alguien roba tu configuración.
>
>**Un detalle CRÍTICO para Artifact Registry**
>Por defecto, si solo corres gcloud auth configure-docker, a veces solo configura el antiguo Container Registry (gcr.io).
>
>Si estás usando el nuevo Artifact Registry, debes pasarle los nombres de los servidores (regiones) que vas a usar. Por ejemplo:
>
>```Bash
>gcloud auth configure-docker us-central1-docker.pkg.dev,europe-west1-docker.pkg.dev
>```
>Sin este paso adicional, cuando intentes subir una imagen a un repositorio en una región específica, Docker te dirá: permission denied o unauthorized.

### 1.4. Construir la imagen localmente (build) 
   
   Ejecutar el comando desde la carpeta donde esta el dockerfile (asegurar antes que Docker esta arrancado en la maquina local)
   
   ```bash
   # plantilla
   docker build -t REGION-docker.pkg.dev/PROJECT_ID/REPO_NAME/IMAGE_NAME:latest .
   ```

Sustituir REGION, PROJECT_ID Y REPO_NAME por los valores adecuados. El nombre de la imagen es totalmente arbitrario y se puede dar el que se desee.

|Parámetro|Valor|
|--------|-------------------|
| REGION | europe-southwest1 |
| project name | project-architecture-test1 |
| PROJECT_ID | project-architecture-test1 |
| project number | 32604191455 |
| REPO_NAME | appgab |
| IMAGE_NAME | appgabinete |

            
   ```bash
   docker build -t europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabinete:latest .  
   ```
Después de ejecutar este comando se debería ver la imagen creada en el docker local.

NOTA: SI YA HAY UNA IMAGEN CONSTRUIDA EN EL DOCKER LOCAL, NO ES NECESARIO ESTE PASO, PERO LA IMAGEN DEBE TENER LA RUTA TAL CUAL SE MUESTRA EN EL COMANDO

>NOTAS
>---
>**DESGLOSE DEL COMANDO:** docker build -t europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabinete:latest .  
>
>1. docker build
>Es la instrucción base. Le pide a Docker que lea un archivo llamado Dockerfile en tu computadora y ejecute los pasos definidos ahí (instalar dependencias, copiar código, etc.) para crear una imagen de software.
>
>2. -t (Flag de Tag)
>Significa "tag" o etiqueta. Se usa para darle un nombre humano y una versión a la imagen que estás creando. Sin esto, la imagen solo tendría un ID hexadecimal difícil de recordar (como a1b2c3d4...).
>
>3. El Nombre de la Imagen (La ruta de GCP)
Esta es la parte más larga y sigue una estructura **obligatoria** para que Google Cloud sepa exactamente dónde guardarla después. Se divide así:
>
>* REGION-docker.pkg.dev: Es el "host" o servidor de Google. (Ejemplo: us-central1-docker.pkg.dev).
>* PROJECT_ID: El ID único de tu proyecto en Google Cloud.
>* REPO_NAME: El nombre del repositorio que creaste en Artifact Registry.
>* appgabinete: El nombre que tú elegiste para esta imagen específica.
>* :latest: La versión o "tag". latest es el estándar para indicar que es la versión más reciente, pero podrías usar :v1, :v2, etc.
>
>4. El punto final .
>Este pequeño punto es CRUCIAL. Le indica a Docker el contexto de construcción. El . significa: "Usa el directorio actual". Docker buscará el archivo Dockerfile en la carpeta donde estés parado en tu terminal.
>
>**Si no le pones ese nombre largo y específico durante el build, Docker no sabrá a qué servidor de Google debe enviar la imagen cuando intentes subirla.**
>
>**Consejo:** Si vas a estar construyendo imágenes seguido, te recomiendo guardar esas variables en tu terminal para no escribir tanto:
>```Bash
>export REPO_URL=us-central1-docker.pkg.dev/mi-proyecto/mi-repo/appgabinete:latest
>docker build -t $REPO_URL
>```
>
>* Para eliminar la imagen creada en local: docker rmi nombre_de_tu_imagen:tag


### 1.5. Subir la imagen a Artifact Registry de GCP (push) 
   
Si el comando docker build que vimos antes servía para empaquetar tu aplicación en una caja (la imagen) dentro de tu computadora, docker push sirve para subir esa caja a la nube de Google. **Específicamente, este comando sube la imagen al servicio Artifact Registry.**

¿Ejecutar el comando desde la carpeta donde esta el dockerfile?
   
   ```bash
   # plantilla
   docker push REGION-docker.pkg.dev/PROJECT_ID/REPO_NAME/IMAGE_NAME:latest
   ```

Sustituir REGION, PROJECT_ID Y REPO_NAME por los valores adecuados. El nombre de la imagen (en este caso appgabinete) es totalmente arbitrario y se puede dar el que se desee.

|Parámetro|Valor|
|--------|-------------------|
| REGION | europe-southwest1 |
| PROJECT_ID | project-architecture-test1 |
| REPO_NAME | appgab |
| IMAGE_NAME | appgabinete |

            
   ```bash
   docker push europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabinete:latest
   ```
>NOTAS
>---
>**Requisitos para que este comando funcione:** Para que no te dé error al darle al Enter, asegúrate de haber cumplido estos tres pasos previos:
>1. Estar logueado: Haber hecho gcloud auth login.
>2. Tener permiso de Docker: Haber ejecutado gcloud auth configure-docker europe-southwest1-docker.pkg.dev.
>3. Tener la imagen local: Haber hecho el docker build con exactamente ese mismo nombre que estás intentando subir.
>
>**Para eliminar la imagen del Artifact Registry**
>* Todas las versiones: gcloud artifacts docker images delete REGION-docker.pkg.dev/PROYECTO/REPO/IMAGEN --delete-tags
>* Solo una version específica: gcloud artifacts docker images delete REGION-docker.pkg.dev/PROYECTO/REPO/IMAGEN:v1.0

### 1.6 Desplegar en Cloud Run (desde Artifact Registry)

      # bash
      gcloud run deploy appgabinete \
      --image  europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabinete:latest \
      --platform managed \
      --region europe-southwest1 \
      --allow-unauthenticated \
      # no usar esto porque el puerto ya lo asigna google
      # con cloud run no se puede mapear puerto a puerto, 
      # en gcp se entra por el puerto por defecto y ya se asigna al que esta escuchando el contenedor 
      # --set-env-vars "PORT=4000" \
      -- port 4000
      --set-env-vars "DATABASE_URL=postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"

```bash
gcloud run deploy appgabinete --image  europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabx:latest --platform managed --region europe-southwest1 --allow-unauthenticated --port 4000 --set-env-vars "DATABASE_URL=postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
```

CORRECCION A PROBAR: ELIMINADO LOS PARAMETROS NO NECESARIOS
(en realidad solo se quita el PORT 4000   ¡INVESTIGAR ESTO!)
```bash
gcloud run deploy appgabinete --image  europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabinete:latest --platform managed --region europe-southwest1 --allow-unauthenticated --set-env-vars "DATABASE_URL=postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
```


Para eliminar el deploy:
```bash
gcloud run services delete NOMBRE_DEL_SERVICIO --region REGION
```

ACLARAR COMO FUNCIONA EL PORT 4000 

En esta versión se sube las credenciales de la base de datos directamente en el deploy.

>NOTAS: Próximos pasos (Tarea 2)
>---
>- EJECUTAR SIN SUBIR LA VARIABLE DE ENTORNO DATABASE_URL SI SE QUIERE QUE SE ACCEDA DESDE UN SECRET MANAGER
>- VER COMO MAPEAR EL SECRET AL HACER DEPLOY (si no da un error y hay que mapear a mano y hacer deploy otra vez)
                     USAR ESTO EN LUGAR DE --set-env-vars :    --set-secrets="[VARIABLE_DE_ENTORNO]=projects/[Project number]/secrets/[NOMBRE_DEL_SECRETO]:[VERSION]"   
                                                               --set-secrets="DATABASE_URL=projects/32604191455/secrets/appgab-db-pwd:latest"   

### 1.6 Probar 

https://appgabinete-32604191455.europe-southwest1.run.app/docs


[PLM 16/10/2025] 
## TAREA 2: INCLUIR LAS CREDENCIALES DE ACCESO A BBDD EN EL SECRET MANAGER DE GCP

### 2.1. Habilitar al API de Secret Manager
```bash
gcloud services enable secretmanager.googleapis.com
```

verificar si está habilitado
```bash
gcloud services list --enabled --filter="name:secretmanager.googleapis.com"
```

### 2.2. Crear el secreto 

Esto es en realidad el "contenedor" del secreto

   ```bash
   gcloud secrets create MI_PASSWORD_DB --replication-policy="automatic"
   ```

   * MI_PASSWORD_DB=appgab-db-pwd
   

### 2.3. Añadir la contraseña (como una version del secreto)

Puede ser una password o una url entera, según se tenga en el codigo

```bash
echo "MI_PASSWORD_SECRETA" | gcloud secrets versions add MI_PASSWORD_DB --data-file=-
```

* MI_PASSWORD_SECRETA="postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
* MI_PASSWORD_DB=appgab-db-pwd

Eliminar el secreto 
```bash
# Plantilla
gcloud secrets delete NOMBRE_DEL_SECRETO --quiet

# Comando
gcloud secrets delete appgab-db-pwd --quiet
```

### 2.4. Configurar Cloud Run para acceder al secreto

   #### 2.4.1. Asignar permisos a la cuenta de servicio de Compute Engine (cuenta formada con project_numer-compute@)

Por seguridad, Cloud Run no puede leer secretos por defecto. Debes darle permiso a la Cuenta de Servicio que usa tu Cloud Run (normalmente la Default Compute Service Account).

```bash
# Plantilla
gcloud projects add-iam-policy-binding TU_PROJECT_ID 
   --member="serviceAccount:$(gcloud projects describe TU_PROJECT_ID 
   --format='value(projectNumber)')-compute@developer.gserviceaccount.com" 
   --role="roles/secretmanager.secretAccessor"

# Comando
gcloud projects add-iam-policy-binding project-architecture-test1 --member="serviceAccount:$(gcloud projects describe project-architecture-test1 --format='value(projectNumber)')-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
```  

Se puede hacer por consola, desde "Services Accounts"

NOTA: ES UNA MEJOR PRACTICA CREAR UNA CUENTA DE SERVICIO ESPECIFICA PARA LA APLICACION CON EL MINIMO PRIVILEGIO
   
2.4.2. Mapear el secreto a una variable de entorno que utilice la aplicacion

2.4.2.1. Se puede hacer desde la consola de GCP, desde la seccion "Variables y Secretos" de un servicio Cloud Run

Montar la contraseña como una variable de entorno + Asignar como nombre de la variable de entorno el que se utilice en el contenedor + Seleccionar el secreto y la version

2.4.2.2. o por comando

Para desplegar el servicio en Cloud Run (desde Artifact Registry), asignando el valor del secret a la variable adecuada

```bash
# Plantilla
gcloud run deploy nombre-servicio \
  --image RUTA_DE_LA_IMAGEN_EN_ARTIFACT_REGISTRY \
  --platform managed \
  --region REGION \
  --allow-unauthenticated
  --set-secrets="API_KEY=MI_SECRET_NAME:1"

# Comando  
gcloud run deploy appgabinete --image  europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabinete:latest --platform managed --region europe-southwest1 --allow-unauthenticated --set-secrets="DATABASE_URL=appgab-db-pwd:latest"
```

Si el servicio está ya desplegado en Cloud Run pero no arrancado o sin secret, se arranca (asignandole el secret)
```bash
# Plantilla
gcloud run services update NOMBRE_DE_TU_SERVICIO \
  --set-secrets="DB_PASS=MI_PASSWORD_DB:latest" \
  --region REGION
# Comando
gcloud run services update appgabinete --set-secrets="DATABASE_URL=appgab-db-pwd:latest" --region europe-southwest1 
```


### 2.5. Para usar el secreto en el contenedor, usarlo como una variable de entorno normal: getenvgetenv("DATABASE_URL")

SI LA VARIABLE DE ENTORNO O SECRETO ES NECESARIA PARA QUE ARRANQUE EL SERVICIO, AL DEPLOY DE LA CLOUD RUN  (gcloud run deploy appgabinete --image...) DARA UN ERROR, SE CREARA LA CLOUD RUN PERO SIN DEPLOY. HAY QUE MAPEAR ENTONCES EL SECRET Y VOLVER A DEPLOY (por consola o por comandos)

VER COMO MAPEAR EL SECRET A LA VEZ QUE SE HACE DEPLOY PARA NO TENER QUE HACER ESTE PASO POSTERIOR !!!!!
EN gcloud run deploy appgabinete --image... USAR ESTO EN LUGAR DE --set-env-vars :  
                                    --set-secrets="[VARIABLE_DE_ENTORNO]=projects/[PROJECT_NUMBER]/secrets/[NOMBRE_DEL_SECRETO]:[VERSION]"    
                                    

[PLM 17/10/2025] 
## TAREA 3: CONFIGURAR EL DEPLOY PARA QUE NO SEA DE ACCESO PUBLICO

### 3.1. Desplegar sin --allow-unauthenticated

```bash
# deploy con secreto en una variable de entorno (mejor usar la version con screct manager) 
gcloud run deploy appgabinete 
   --image europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabx:latest 
   --platform managed 
   --region europe-southwest1 
   --port 4000 
   --set-env-vars "DATABASE_URL=postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
```

PREGUNTA AL DESPLEGAR SI SE QUIERE UNAUTHENTICATED MODE O NO: RESPONDER NO  -- ¡¡¡ VER COMO HACER DEPLOY SIN QUE PREGUNTE !!!

### 3.2. Para poder invocar al servicio de forma manual, hacer 2 pasos:

3.2.1. Dar permisos de invocador a una identidad de Google (un correo):  

  3.2.1.1 Seleccionar servicio en Cloud Run

  3.2.1.2 Pestaña Permisos
  
  3.2.1.3 Agregar Principal: Insertar identidad con un correo (o cuenta de servicio) + Asignar role: Cloud Run Invoker

3.2.2. Para usar el servicio es necesario:
  
  3.2.2.1 Generar un token para la identidad del Paso 1:  Autenticarse en GCP con la identidad adecuada + ejecutar $gcloud auth print-identity-token
  
  3.2.2.2 Utilizar el token (bearer token) obtenido en el paso 3.2.2.1 en el header de la llamada: --header 'Authorization:[TOKEN]' 

### 3.3. Para poder invocar al servicio desde otro servicio de GPC:

* La cuenta de servicio que ejecuta el servicio llamante es la que tiene que tener los permisos Invoker en el servicio de cloud run

* Con esta cuenta de servicio y las librerias de Google, se obtiene un token en el servicio llamante para poder hacer la llamada a la api igual que 3.2.2

### 3.4. Para poder invocar al servicio desde otro servicio externo:
   
   #### 3.4.1. Crear una cuenta de servicio (en IAM - Cuentas de Servicio)

   3.4.2  Desde la Cloud Run - Permisos, asignar role Cloud Run Invoker
   
   3.4.3  Generar y descargar la clave JSON: 
      3.4.3.1 desde IAM - Cuentas de servicio, ir a la cuenta de servicio asociada con el Servicio
      3.4.3.2 Pestaña Claves + Crear Clave + Tipo JSON
      3.4.3.3 Se descarga un archivo que hay que utilizar en el servicio invocador  
   
   3.4.4 Para poder autenticar al serivicio que llama, hay que obtener un token asociado a la cuenta de servicio 
      3.4.4.1 obteniendo el token por medio de librerias de autenticacion de google + el archivo json descargado + variable de entorno GOOGLE_APPLICATION_CREDENTIALS
   
   3.4.5 Con el token obtenido, se hace una llamada como en el paso 3.2.2


## TAREA 4: SIGUIENTES PASOS

 . ver si al elimnar la imagen en Artifact Registry, sigue funcionando la Cloud Run
      SI QUE SIGUE FUNCIONANDO LA CLOUD RUN

 . Al hacer el build (local) ¿es necesario un tag tan largo?
      PARECE QUE SI ES NECESARIO PARA QUE PUEDA SUBIR LA IMAGEN (push) AL Artifact Registry DEL PROYECTO ADECUADO

 . NO pasar el secret en la url (lo coge de un gestor de secretos)  : DONE!!!!!

 . Securizar el contenedor (no publico)  -- DONE!!!
 
## TAREA 5: CREAR TODO

```bash
# 1. Autenticarse en el powershell

gcloud auth login

# 2. Crear Repositorio
gcloud artifacts repositories create appgab --repository-format=docker --location=europe-southwest1 --description="Docker images for AppGabinete"

# 3. Autenticar el docker local
 gcloud auth configure-docker europe-southwest1-docker.pkg.dev
 
#4. Construir la imagen localmente
 docker build -t europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabinete:latest .  

#5. Subir la imagen a artifact registry
docker push europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabinete:latest

#6. Crear el secreto y añadir la contraseña
  gcloud secrets create appgab-db-pwd --replication-policy="automatic"

  echo "postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres" | gcloud secrets versions add appgab-db-pwd --data-file=-

#7. Dar permisos a la cuenta del servicio para acceder al secreto
gcloud projects add-iam-policy-binding project-architecture-test1 --member="serviceAccount:$(gcloud projects describe project-architecture-test1 --format='value(projectNumber)')-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"

#8. Desplegar con acceso al Secret Manager
gcloud run deploy appgabinete --image  europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabinete:latest --platform managed --region europe-southwest1 --allow-unauthenticated --set-secrets="DATABASE_URL=appgab-db-pwd:latest"


#Probar 
https://appgabinete-32604191455.europe-southwest1.run.app/docs
```


## TAREA 6: ELIMINAR TODO

1. Eliminar el servicio (el deploy): 
```bash
#eliminar servicio   
gcloud run services delete appgabinete --region europe-southwest1

#listar servicios
gcloud run services list  #todos
gcloud run services list --filter="SERVICE:nombre-de-tu-servicio" #por nombre
```
2. Eliminar la imagen en Artifact Registry: 
```bash
gcloud artifacts docker images delete europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabinete --delete-tags

#listar imagenes de un repositorio
gcloud artifacts docker images list REGION-docker.pkg.dev/project-architecture-test1/appgab-db-pwd #todas las imagenes del repositorio
gcloud artifacts docker images list REGION-docker.pkg.dev/project-architecture-test1/appgab-db-pwd/NOMBRE_IMAGEN --include-tags #todas las versiones de una image
```
3. Eliminar un repositorio de Artifact Registry (si se elimina el repo, se eliminan las imagenes que contiene)
```bash
#eliminar repositorio
gcloud artifacts repositories delete appgab --location=europe-southwest1

#listar repositorios
gcloud artifacts repositories list
```
4. Eliminar el secreto de Secret Manager
```bash
#eliminar secreto
gcloud secrets delete appgab-db-pwd --quiet
```

5. Eliminar la imagen en el docker local: 
```bash
docker rmi europe-southwest1-docker.pkg.dev/project-architecture-test1/appgab/appgabinete
```
6. Logout: 
```bash
gcloud auth revoke
```