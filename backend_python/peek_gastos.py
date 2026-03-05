import os
from sqlalchemy import create_engine, text

DATABASE_URL = 'postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require'
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("--- Data in table 'gastos' ---")
    res = conn.execute(text("SELECT * FROM public.gastos LIMIT 5"))
    columns = res.keys()
    rows = res.fetchall()
    print(f"Columns: {list(columns)}")
    for row in rows:
        print(row)
