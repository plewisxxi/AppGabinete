import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.dialects import postgresql
from sqlalchemy import Integer, BigInteger, SmallInteger, Numeric, Float, Boolean, DateTime, Date, Time, String, Text
from sqlalchemy.types import JSON, ARRAY
from dotenv import load_dotenv
from inflection import camelize, singularize

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("DATABASE_URL not set in environment (.env)")

OUT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app", "models.py"))

engine = create_engine(DATABASE_URL)
meta = MetaData()
meta.reflect(bind=engine)

type_map = {
    Integer: "int",
    BigInteger: "int",
    SmallInteger: "int",
    Numeric: "float",
    Float: "float",
    Boolean: "bool",
    DateTime: "datetime",
    Date: "date",
    Time: "str",
    String: "str",
    Text: "str",
    JSON: "dict",
    ARRAY: "List",
    postgresql.UUID: "str",
    postgresql.JSONB: "dict",
    postgresql.MONEY: "float",
}

need_datetime = False
need_date = False
need_decimal = False
need_typing_list = False

def col_pytype(col):
    global need_datetime, need_date, need_decimal, need_typing_list
    typ = type(col.type)
    # check dialect specific first
    if isinstance(col.type, postgresql.UUID):
        return "str", False
    for tclass, py in type_map.items():
        try:
            if isinstance(col.type, tclass) or typ is tclass:
                if py == "datetime":
                    need_datetime = True
                if py == "date":
                    need_date = True
                if py == "List":
                    need_typing_list = True
                return py, col.nullable
        except Exception:
            continue
    # fallback
    return "str", col.nullable

def safe_name(n: str):
    return n.lower().replace(" ", "_").replace("-", "_")

lines = []
lines.append("from sqlmodel import Field, SQLModel")
imports = set(["from typing import Optional"])
if any(isinstance(c.type, DateTime) for t in meta.tables.values() for c in t.columns):
    imports.add("from datetime import datetime")
if any(isinstance(c.type, Date) for t in meta.tables.values() for c in t.columns):
    imports.add("import datetime as _dt")
if any(isinstance(c.type, Numeric) for t in meta.tables.values() for c in t.columns):
    imports.add("from decimal import Decimal")
if any(isinstance(c.type, ARRAY) for t in meta.tables.values() for c in t.columns):
    imports.add("from typing import List, Any")
else:
    imports.add("from typing import List")

lines.extend(sorted(list(imports)))
lines.append("")
lines.append("# Auto-generated models from DB schema")
lines.append("")

for tbl_name, table in meta.tables.items():
    cls = camelize(singularize(tbl_name))
    lines.append(f"class {cls}Base(SQLModel):")
    if not table.columns:
        lines.append("    pass")
    else:
        for col in table.columns:
            name = safe_name(col.name)
            pytype, nullable = col_pytype(col)
            optional = nullable or col.primary_key
            type_decl = f"Optional[{pytype}]" if optional else pytype
            if col.primary_key:
                lines.append(f"    {name}: {type_decl} = Field(default=None, primary_key=True)")
            else:
                if optional:
                    lines.append(f"    {name}: {type_decl} = Field(default=None)")
                else:
                    lines.append(f"    {name}: {type_decl}")
    lines.append("")
    lines.append(f"class {cls}({cls}Base, table=True):")
    # Ensure there is an id primary key - if not present, add an auto id
    has_pk = any(c.primary_key for c in table.columns)
    if not has_pk:
        lines.append("    id: Optional[int] = Field(default=None, primary_key=True)")
    else:
        lines.append("    pass")
    lines.append("")

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"Generated models written to {OUT_PATH}")
print("Review relationships and foreign keys manually (script generates FK columns but no Relationship() helpers).")