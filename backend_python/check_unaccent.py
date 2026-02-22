from app.database import engine
from sqlalchemy import text

def check_unaccent():
    with engine.connect() as conn:
        try:
            print("Attempting to create extension unaccent...")
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))
            conn.commit()
            print("Extension created (or already exists).")
            
            print("Testing unaccent function...")
            result = conn.execute(text("SELECT unaccent('Héllö')")).scalar()
            print(f"Result: {result}")
            
            if result == "Hello":
                print("SUCCESS: unaccent works.")
            else:
                print(f"FAILURE: Unexpected result '{result}'")
                
        except Exception as e:
            print(f"ERROR: {e}")

if __name__ == "__main__":
    check_unaccent()
