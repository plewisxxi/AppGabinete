from app.models import Contacto
from app.database import engine
from sqlmodel import Session, select
from sqlalchemy import func, or_
import logging

def debug_search():
    with Session(engine) as session:
        # 1. Create dummy contact with accent
        test_nif = "DEBUG_CASE"
        existing = session.get(Contacto, test_nif)
        if existing:
            session.delete(existing)
            session.commit()
            
        dummy = Contacto(NIF=test_nif, Nombre="José María", Poblacion="Málaga")
        session.add(dummy)
        session.commit()
        print(f"Created dummy contact: {dummy.Nombre}")
        
        # 2. Search with 'jose' using dynamic logic
        q = "jose"
        print(f"\nSearching for '{q}' using dynamic loop...")
        
        stmt = select(Contacto)
        ors = []
        
        # Exact logic from router
        for col in Contacto.__table__.columns:
            is_string = False
            try:
                if hasattr(col.type, "python_type") and col.type.python_type == str:
                    is_string = True
            except NotImplementedError:
                if "String" in type(col.type).__name__:
                    is_string = True
            
            print(f"Column {col.name}: is_string={is_string} (Type: {type(col.type).__name__})")

            if is_string:
                try:
                    ors.append(func.unaccent(getattr(Contacto, col.name)).ilike(func.unaccent(f"%{q}%")))
                except Exception as e:
                    print(f"Error appending filter for {col.name}: {e}")
                    continue
        
        if ors:
            stmt = stmt.where(or_(*ors))
            
        results = session.exec(stmt).all()
        print(f"Found {len(results)} results.")
        for r in results:
            print(f" - {r.Nombre}")

        # Cleanup
        session.delete(dummy)
        session.commit()

if __name__ == "__main__":
    debug_search()
