from app.database import engine
from sqlmodel import text

def migrate_add_numero_factura():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE sesion ADD COLUMN numeroFactura VARCHAR"))
            conn.commit()
            print("Added 'numeroFactura' column to sesion table.")
        except Exception as e:
            print(f"Error adding column (maybe exists): {e}")

if __name__ == "__main__":
    migrate_add_numero_factura()
