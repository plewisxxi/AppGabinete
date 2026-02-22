from sqlmodel import Session, select
from app.database import engine, init_db
from app.models import Metadatos

def seed_metadatos():
    init_db() # Ensure tables exist
    with Session(engine) as session:
        # Check Serie
        serie = session.get(Metadatos, "Serie")
        if not serie:
            session.add(Metadatos(clave="Serie", valor="F"))
            print("Seeded 'Serie' = 'F'")
        
        # Check ultimoNumeroFactura
        last_num = session.get(Metadatos, "ultimoNumeroFactura")
        if not last_num:
            session.add(Metadatos(clave="ultimoNumeroFactura", valor="0"))
            print("Seeded 'ultimoNumeroFactura' = '0'")
        
        session.commit()
        print("Seeding complete.")

if __name__ == "__main__":
    seed_metadatos()
