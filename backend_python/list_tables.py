import os
from sqlalchemy import create_engine, text

DATABASE_URL = 'postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require'
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
    for t in res.fetchall():
        print(f"Table: {t[0]}")
