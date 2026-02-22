Backend FastAPI (Python) - AppGabinete

1. Copiar .env.example -> .env y rellenar DATABASE_URL con la URL de Supabase.
2. Instalar:
      pip install -r requirements.txt
3. Ejecutar en dev:
      uvicorn app.main:app --reload --host 0.0.0.0 --port 4000

      (si no ejecuta, activar en virtual enviroment de python con  & c:/DESARROLLO/AppGabinete/.venv/Scripts/Activate.ps1)
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
 [15/11/2025] CREAR AMBAS IMAGENES (FRONT Y BACK) CON EL COMPOSE Y CREANDO UNA RED
 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
1. MOVERSE A LA CARPETA DONDE ESTA EL ARCHIVO DOCKER-COMPOSE.YML
2. EJECUTAR: docker-compose up --build