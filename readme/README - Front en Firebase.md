# Publicar la aplicación web en Firebase

Para desplegar una web estática desarrollada con React en Firebase (versión gratuita - Spark Plan) los pasos a realizar son:

## 0. Pasos previos para preparar la instalación

Situarse en la carpeta del código fuente del front y ejecutar:

```bash
npx firebase init hosting
```

Lo primero que te preguntará es si quieres crear un proyecto nuevo en Firebase o usar uno ya existente (te permite elegir)

*-Ver como hacer que te vuelva a preguntar cual proyecto elegir, porque borrando las carpetas y archivos no es suficiente-*

A continuación, prenguntará la configuración deseada:

* **What do you want to use as your public directory?** Escribe: dist

* **Configure as a single-page app (rewrite all urls to /index.html)?** Responde: Yes (esto es vital si usas React, Vue o Angular).

* **File dist/index.html already exists. Overwrite?** ¡Responde NO! (Presiona n). Esto es muy importante para que Firebase no borre tu aplicación real con su plantilla de bienvenida.

Una vez inicializada la carpeta, ya no es necesario volver a repetirla porque  creará algunas carpetas y archivos dentro de la carpeta del código fuente (que será necesario eliminar si se quiere reiniciar todo y volver a hacer firebase init)

Las carpetas que crea son:

* La carpeta oculta *.firebase/*
* El archivo *firebase.json*
* El archivo *.firebaserc*
* **Importante**: Si Firebase creó un archivo *index.html* genérico (el que dice "Welcome"), bórralo también para que no sobrescriba el tuyo.

## 1. Construir la web en local a partir del codigo fuente 

Una vez configurada la carpeta (solo hacerlo una vez) y dentro de la carpeta donde está el código fuente de la web app (donde está el archivo index.html), ejecutar:

```bash
Bash
npm run build .
```

Esto generará la carpeta *dist* dentro de la carpeta de la app.

*ESTO SOLO HACERLO UNA VEZ O CADA VEZ QUE CAMBIA EL CÓDIGO FUENTE*

## 2. Despliegue en Firebase

Una vez configurado correctamente y creada la web, desplegar:

```bash
Bash
npx firebase deploy
```

Con esto la web ya está desplegada y funcionando y debería ser accesible con la url que se obtiene desde la consola de Firebase.

Para comprobar que todo ha ido bien se debería tener el archivo firebase.json en la carpeta principal del código fuente, y al abrirlo, debería decir algo como:
"public": "dist".

## 3. Para deshabilitar la web en Firebase (si eliminar el sitio)

Utilizar la opción de Disable Hosting

Esta es la mejor si quieres que el sitio deje de estar en línea pero no quieres borrar tu proyecto de Firebase. Los usuarios verán un error 404 de Firebase, pero tus archivos y configuración seguirán guardados en el historial de despliegues.

Desde la carpeta raíz de tu proyecto, ejecuta:

```bash
Bash
npx firebase hosting:disable
```

(para habilitarlo de nuevo ir al Paso 2)