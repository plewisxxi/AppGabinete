import os
import sys
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("Saving schema for table 'gastos' to schema_gastos.txt...")
        result = conn.execute(text("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE lower(table_name) = 'gastos' ORDER BY ordinal_position"))
        rows = result.fetchall()
        with open("schema_gastos.txt", "w") as f:
            if not rows:
                f.write("No columns found for 'gastos'.")
            for row in rows:
                f.write(f"Column: {row[0]}, Type: {row[1]}, Nullable: {row[2]}\n")
        print("Success!")
except Exception as e:
    print(f"Error: {e}")
    with open("schema_gastos.txt", "w") as f:
        f.write(f"Error: {e}")
