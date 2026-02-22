import os
from sqlalchemy import create_engine, text

# Hardcoded for quick check since env loading failed
url = "postgresql://postgres.wqpwgnxsfmovxvwarszt:JSkAggDvU6Y!uJ+@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
engine = create_engine(url)
with engine.connect() as conn:
    print(conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'metadatos'")).fetchall())
