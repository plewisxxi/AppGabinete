from os import getenv
from sqlmodel import create_engine, SQLModel
from dotenv import load_dotenv
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

load_dotenv()

DATABASE_URL = getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set in environment")

# ensure sslmode=require in the URL query (helps with Supabase SSL)
parsed = urlparse(DATABASE_URL)
qs = parse_qs(parsed.query)
if "sslmode" not in qs:
    qs["sslmode"] = ["require"]
new_query = urlencode({k: v[0] for k, v in qs.items()})
DATABASE_URL = urlunparse(parsed._replace(query=new_query))

# create engine; connect_args left empty because sslmode is in the URL
engine = create_engine(DATABASE_URL, echo=False, connect_args={"connect_timeout": 10})
def init_db():
    # Import the models module (avoid wildcard import inside a function); importing the module
    # ensures model classes are registered with SQLModel.metadata.
    from . import models  # noqa: F401
    SQLModel.metadata.create_all(engine)