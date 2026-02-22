from app.database import engine
from sqlmodel import Session, select
from sqlalchemy import func, text

def debug_unaccent_direct():
    with Session(engine) as session:
        # Test unaccent directly
        try:
            val = "José María"
            stmt = select(func.unaccent(val))
            result = session.exec(stmt).one()
            print(f"Original: '{val}' -> unaccent: '{result}'")
            
            if result == "Jose Maria":
                print("SUCCESS: unaccent conversion works.")
            else:
                print(f"FAILURE: Expected 'Jose Maria', got '{result}'")
                
            # Verify extension existence
            ext_stmt = text("SELECT * FROM pg_extension WHERE extname = 'unaccent'")
            ext = session.exec(ext_stmt).first()
            print(f"Extension 'unaccent' installed: {ext is not None}")
            
        except Exception as e:
            print(f"ERROR: {e}")

if __name__ == "__main__":
    debug_unaccent_direct()
