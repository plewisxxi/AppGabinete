import os
from sqlalchemy import create_engine, text

DATABASE_URL = 'postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require'
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("--- Searching for tables named 'gastos' (case insensitive) ---")
    res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND lower(table_name) = 'gastos'"))
    tables = res.fetchall()
    for t in tables:
        print(f"Actual Table Name in DB: {t[0]}")
        count = conn.execute(text(f"SELECT count(*) FROM public.\"{t[0]}\"")).scalar()
        print(f"Row count in {t[0]}: {count}")
        
    print("\n--- Current SQLModel default for 'Gasto' ---")
    # We can't easily check SQLModel's internal mapping here without importing it, 
    # but we know it usually defaults to lowercase class name.
