import os
import sys
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("Schema for table 'Gastos':")
        result = conn.execute(text("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'Gastos' ORDER BY ordinal_position"))
        for row in result:
            print(f"Column: {row[0]}, Type: {row[1]}, Nullable: {row[2]}")
except Exception as e:
    print(f"Error: {e}")
