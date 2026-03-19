import os
from sqlalchemy import create_engine, MetaData
from dotenv import load_dotenv
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

load_dotenv()
db_url = os.environ.get("DATABASE_URL")

parsed = urlparse(db_url)
qs = parse_qs(parsed.query)
if "sslmode" not in qs:
    qs["sslmode"] = ["require"]
new_query = urlencode({k: v[0] for k, v in qs.items()})
db_url = urlunparse(parsed._replace(query=new_query))

engine = create_engine(db_url)
metadata = MetaData()
metadata.reflect(bind=engine)

for table in metadata.sorted_tables:
    if "usuari" in table.name.lower() or "empresa" in table.name.lower():
        print(f"Table: {table.name}")
        for col in table.columns:
            print(f"  - {col.name} ({col.type})")
