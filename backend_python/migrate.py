from app.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Migrating database...")
        try:
            conn.execute(text('ALTER TABLE periodo ADD COLUMN "fechaInicioPeriodo" DATE'))
            print("Added fechaInicioPeriodo to periodo")
        except Exception as e:
            print(f"Skipping fechaInicioPeriodo (probably exists): {e}")

        try:
            conn.execute(text('ALTER TABLE sesion ADD COLUMN pendiente NUMERIC'))
            print("Added pendiente to sesion")
        except Exception as e:
            print(f"Skipping pendiente (probably exists): {e}")
        
        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
