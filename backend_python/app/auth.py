from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth as firebase_auth
from sqlmodel import Session, select
from typing import List
from .database import get_session

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    session: Session = Depends(get_session)
) -> List[int]:
    """
    Verifica el token de Firebase.
    Busca al usuario en la base de datos (por firebase_uid o email).
    Si no existe, lo crea en estado PENDIENTE.
    Si no está ACTIVO, rechaza la petición.
    Devuelve la lista de empresa_id a las que tiene acceso.
    """
    token = credentials.credentials
    try:
        decoded_token = firebase_auth.verify_id_token(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token inválido o expirado: {str(e)}")
        
    firebase_uid = decoded_token.get("uid")
    email = decoded_token.get("email")
    nombre = decoded_token.get("name")
    
    if not firebase_uid:
        raise HTTPException(status_code=401, detail="Token no contiene UID")
        
    from .models import Usuario, UsuarioEmpresa
    
    usuario = session.exec(select(Usuario).where(Usuario.firebase_uid == firebase_uid)).first()
    
    if not usuario and email:
        # Intentar por email si no tiene uid seteado
        usuario = session.exec(select(Usuario).where(Usuario.email == email)).first()
        if usuario:
            usuario.firebase_uid = firebase_uid
            # Opcional: actualizar nombre si no lo tenía
            if not usuario.nombre:
                try:
                    user_record = firebase_auth.get_user(firebase_uid)
                    usuario.nombre = user_record.display_name or nombre
                except:
                    usuario.nombre = nombre
            session.add(usuario)
            session.commit()
            session.refresh(usuario)
            
    if not usuario:
        # Intentar obtener el nombre directamente de Firebase Auth si no viene en el token
        if not nombre:
            try:
                user_record = firebase_auth.get_user(firebase_uid)
                nombre = user_record.display_name
            except:
                pass

        # Crear en estado pendiente
        nuevo_usuario = Usuario(
            firebase_uid=firebase_uid,
            email=email,
            nombre=nombre,
            estado='PENDIENTE'
        )
        session.add(nuevo_usuario)
        session.commit()
        session.refresh(nuevo_usuario)
        usuario = nuevo_usuario
        
    if usuario.estado != 'ACTIVO':
        raise HTTPException(status_code=403, detail="Usuario pendiente de activación o inactivo")
        
    empresas = session.exec(select(UsuarioEmpresa.empresa_id).where(UsuarioEmpresa.usuario_id == usuario.id)).all()
    
    if not empresas:
        raise HTTPException(status_code=403, detail="Usuario no tiene ninguna empresa asignada")
        
    return list(empresas)
