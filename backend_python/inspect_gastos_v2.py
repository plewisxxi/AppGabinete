import os
import sys
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("Checking all tables...")
        tables = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).fetchall()
        for t in tables:
            print(f"Table: {t[0]}")
        
        print("\nSchema for table 'gastos' (case-insensitive search):")
        result = conn.execute(text("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE lower(table_name) = 'gastos' ORDER BY ordinal_position"))
        rows = result.fetchall()
        if not rows:
            print("No columns found for 'gastos'.")
        for row in rows:
            print(f"Column: {row[0]}, Type: {row[1]}, Nullable: {row[2]}")
except Exception as e:
    print(f"Error: {e}")
