# Permitir autenticarse con el usuario de Google por medio de Firebase Authentication

Para implementar autenticación y autorización en tu proyecto con un backend en Python y un frontend en React, puedes aprovechar **Firebase Authentication**, que es una solución robusta y escalable para gestionar usuarios.

Este proceso pemitirá al front solicitar al usuario autenticación contra Google. 

En tu frontend de React, puedes integrar fácilmente Firebase Authentication para permitir que los usuarios inicien sesión con sus cuentas de Google. El SDK de Firebase en el cliente se encargará del flujo de autenticación de Google y, una vez que el usuario se autentique correctamente, obtendrás un token de identificación (ID token) de Firebase. Este token es crucial porque contiene información sobre el usuario autenticado.

La autenticación solo hace eso, garantizar que el usuario es quien dice es (la autenticación la dará Google, con la cuenta de Google), pero no autoriza nada. La autorización se debe gestionar en el backend, a partir de UID o del email del usuario autenticado (obtenido desde el ID token generado por Firebase)

**Pasos previos para configurar todo**

Configura Firebase Console:

1. Ve a Firebase Console
    * Selecciona tu proyecto "appgabdishac"
    * Ve a "Authentication" > "Sign-in method"
    * Habilita "Google" como proveedor de autenticación
2. Obtén tu configuración de Firebase:
    * En Firebase Console, ve a "Project settings" > "General" > "Your apps"
    * Si no tienes una app web, crea una nueva
    * Copia la configuración (apiKey, authDomain, etc.) y reemplaza los placeholders en src/firebase.js

3. Configura el dominio autorizado:
    * En Firebase Console, en "Authentication" > "Settings" > "Authorized domains"
    * Agrega tu dominio local (ej: localhost) y el dominio de producción

**Firebase Authentication** da la siguiente funcionalidad:

* Al entrar en la aplicación web, si el usuario no está ya autenticado, muestra la ventana de *Hacer login* y redirige hacia el login de Google

* Una vez autenticado en Google, este devuelve al front un ID token con información del usuario autenticado (fundamentalmente el email y un UID único)

* El frontend puede usar este ID token para enviarlo con cada llamada al backend (en el header) 

* El backend puede usar las librerias de Firebase (Firebase Admin SDK) para (1) verificar el token y (2) obtener la información del usuario autenticado (email o UID) y usarlas en las consultas o en autorizar las llamadas


**Para permitir al front hacer todo esto, hay que crear cosas en el código fuente:**

* Crear el archivo *firebase.json* con los datos de configuración de Firebase (obtenidos al crear una App en la consola de Firebase -> Configuración -> General -> Tus apps). Ver Paso 2 anterior.

* Crear el archivo *AuthContext.jsx* para manejar el inicio y cierre de sesion con React (en alguna documentación viene que este archivo debe estar en la carpeta components)

* Integrar todo lo creado con la aplicación principal en App.js

**EN EL CÓDIGO FUENTE DE REACT SE HAN CREADO LOS ARCHIVOS login.jsx Y AuthContext.jsx AVERIGUAR CUAL ES EL PAPEL DE CADA UNO Y SI SON NECESARIOS LAS DOS**

**La función de lo creado en el código fuente es la siguiente:**


* **firebase.js** (o firebase-config.js) : Este archivo se encarga de inicializar tu aplicación Firebase con las credenciales específicas de tu proyecto Firebase. Exporta la instancia de autenticación ( auth ) y el proveedor de Google ( googleProvider ) para que puedan ser utilizados en otros componentes.

* **Auth.jsx** (o AuthContext.jsx) :
    * Utiliza el hook useState para mantener el estado del usuario ( user ).

    * El hook useEffect se suscribe a los cambios en el estado de autenticación de Firebase ( onAuthStateChanged ). Cada vez que el usuario inicia o cierra sesión, este listener se activa y actualiza el estado user .

    * signInWithGoogle es una función asíncrona que usa signInWithPopup(auth, googleProvider) para abrir una ventana emergente de Google para que el usuario inicie sesión. Si prefieres una redirección, puedes usar signInWithRedirect .

    * logout es una función asíncrona que llama a signOut(auth) para cerrar la sesión del usuario.

    * El renderizado condicional muestra diferentes botones y mensajes dependiendo de si el usuario está autenticado o no.

# Siguiente pasos

Una vez que hayas verificado el token y tengas la información del usuario autenticado, puedes implementar tu lógica de autorización. 

Tu backend puede usar el UID o el correo electrónico del usuario para consultar tu base de datos y recuperar solo los datos asociados a los grupos a los que ese usuario pertenece. 

Por ejemplo, podrías tener una tabla de usuarios que asocie cada UID de Firebase con los grupos de datos a los que tiene acceso. De esta manera, garantizas que cada usuario solo acceda a los datos que le corresponden, controlando la información devuelta por tus APIs. 

Firebase Authentication ofrece servicios de backend seguros para autenticar usuarios, y es compatible con proveedores de identidad federados como Google.