from app.models import Sesion
from app.database import engine
from sqlmodel import Session, select
from sqlalchemy import func, or_
from sqlalchemy import cast, String
import logging

def debug_sesiones_existing():
    with Session(engine) as session:
        print("Debugging existing sessions...")
        
        # 1. Verify existence of accented record
        term_accent = "Pedagógica"
        stmt = select(Sesion).where(Sesion.concepto.ilike(f"%{term_accent}%"))
        results_accent = session.exec(stmt).all()
        print(f"Searching for '{term_accent}' found {len(results_accent)} records.")
        
        if not results_accent:
            print("WARNING: No record found with 'Pedagógica'. Trying 'pedagógica' (lowercase).")
            term_accent = "pedagógica"
            stmt = select(Sesion).where(Sesion.concepto.ilike(f"%{term_accent}%"))
            results_accent = session.exec(stmt).all()
            print(f"Searching for '{term_accent}' found {len(results_accent)} records.")
            
        if not results_accent:
            print("CRITICAL: Cannot proceed. No record with accented term found to test against.")
            # List some concepts to see what's there
            print("Sample concepts in DB:")
            samples = session.exec(select(Sesion).limit(5)).all()
            for s in samples:
                print(f" - {s.concepto}")
            return

        print("Confirmed accented record exists.")

        # 2. Search with 'pedagogica' (no accent) using dynamic logic
        q = "pedagogica"
        print(f"\nSearching for '{q}' using unaccent logic...")
        
        stmt = select(Sesion)
        ors = []
        
        for col in Sesion.__table__.columns:
            is_string = False
            try:
                if hasattr(col.type, "python_type") and col.type.python_type == str:
                    is_string = True
            except NotImplementedError:
                if "String" in type(col.type).__name__:
                    is_string = True
            
            if is_string:
                try:
                    from sqlalchemy import cast, String
                    # Using the exact logic from router
                    ors.append(func.unaccent(cast(getattr(Sesion, col.name), String)).ilike(func.unaccent(f"%{q}%")))
                except Exception as e:
                    print(f"ERROR filtering {col.name}: {e}")
                    continue
        
        if ors:
            stmt = stmt.where(or_(*ors))
            
        results_unaccent = session.exec(stmt).all()
        print(f"Found {len(results_unaccent)} results with unaccent search.")
        
        if len(results_unaccent) > 0:
            print("SUCCESS: Search worked.")
        else:
            print("FAILURE: Search failed to find the record.")

if __name__ == "__main__":
    debug_sesiones_existing()
