from app.database import engine
from sqlmodel import Session, select
from app.models import Sesion
from sqlalchemy import func
from datetime import date

def debug_date_filter():
    with Session(engine) as session:
        print("Checking date filtering...")
        
        # 1. Check existing dates to pick a valid year
        print("Sample dates:")
        samples = session.exec(select(Sesion).limit(5)).all()
        years = set()
        for s in samples:
            print(f" - ID: {s.idSesion}, Date: {s.fechaOperacion}")
            if s.fechaOperacion:
                years.add(s.fechaOperacion.year)
        
        if not years:
            print("No sessions found to test.")
            return

        test_year = list(years)[0]
        print(f"\nTesting Year Filter: {test_year}")
        
        # 2. Test Year Filter
        stmt = select(Sesion).where(func.extract('year', Sesion.fechaOperacion) == test_year)
        count_year = len(session.exec(stmt).all())
        print(f"Count for year {test_year}: {count_year}")
        
        # 3. Test Invalid Year
        stmt = select(Sesion).where(func.extract('year', Sesion.fechaOperacion) == 1900)
        count_invalid = len(session.exec(stmt).all())
        print(f"Count for year 1900: {count_invalid}")
        
        if count_year > 0 and count_invalid == 0:
            print("SUCCESS: Year filtering works.")
        else:
            print("FAILURE: Year filtering suspect.")
            
        # 4. Test Quarter
        print(f"\nTesting Quarter Filter (Year {test_year})")
        # Find a quarter that has data
        valid_q = None
        for q in range(1, 5):
            stmt = select(Sesion).where(func.extract('year', Sesion.fechaOperacion) == test_year)\
                                 .where(func.extract('quarter', Sesion.fechaOperacion) == q)
            c = len(session.exec(stmt).all())
            print(f" - Q{q}: {c}")
            if c > 0: valid_q = q
            
        if valid_q:
            print(f"SUCCESS: Found data in Q{valid_q}.")
        else:
            print("WARNING: No data in any quarter? (Maybe dates are null?)")

if __name__ == "__main__":
    debug_date_filter()
