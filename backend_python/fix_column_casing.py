from app.database import engine
from sqlmodel import text

def fix_column_case():
    with engine.connect() as conn:
        try:
            # Rename lowercase to CamelCase
            conn.execute(text('ALTER TABLE sesion RENAME COLUMN numerofactura TO "numeroFactura"'))
            conn.commit()
            print("Renamed 'numerofactura' to 'numeroFactura'.")
        except Exception as e:
            print(f"Error renaming column: {e}")

if __name__ == "__main__":
    fix_column_case()
