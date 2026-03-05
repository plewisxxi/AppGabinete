import os
from sqlalchemy import create_engine, text

DATABASE_URL = 'postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require'
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("--- Exact column names in 'gastos' ---")
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'gastos'"))
    for r in res.fetchall():
        print(f"'{r[0]}'")
