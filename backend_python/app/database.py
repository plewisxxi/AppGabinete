from os import getenv
from typing import Generator
from sqlmodel import SQLModel, create_engine, Session
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
_engine_kwargs = {"connect_args": {"check_same_thread": False}} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, **_engine_kwargs)


def get_engine():
    return engine


def init_db() -> None:
    # crea tablas a partir de los modelos (útil en dev)
    SQLModel.metadata.create_all(bind=engine)


def get_session() -> Generator[Session, None, None]:
    """
    Dependencia para FastAPI: yield a SQLModel Session
    Uso: session: Session = Depends(get_session)
    """
    with Session(engine) as session:
        yield session