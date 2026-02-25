from dotenv import load_dotenv
load_dotenv('backend_python/.env')

import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend_python'))

from sqlmodel import Session, select
from app.database import engine
from app.models import Factura
from sqlalchemy import func, asc, desc, cast, Integer
import traceback

def debug_query():
    print("Testing query with numeric sorting and subquery...")
    try:
        with Session(engine) as session:
            # 1. Reproduce subquery
            ids_stmt = select(Factura.numeroFactura)
            filtered_ids = ids_stmt.subquery()
            
            # 2. Reproduce main query
            from app.models import Contacto
            stmt = (
                select(Factura, Contacto.Nombre)
                .outerjoin(Contacto, Factura.NIFCliente == Contacto.NIF)
                .where(Factura.numeroFactura.in_(select(filtered_ids.c.numeroFactura)))
            )
            
            # 3. Reproduce sorting
            from sqlalchemy import BigInteger
            serie_part = func.split_part(Factura.numeroFactura, "-", 1)
            num_part = func.split_part(Factura.numeroFactura, "-", 2)
            serie_int = cast(func.nullif(func.regexp_replace(serie_part, "[^0-9]", "", "g"), ""), BigInteger).label("serie_int")
            num_int = cast(func.nullif(func.regexp_replace(num_part, "[^0-9]", "", "g"), ""), BigInteger).label("num_int")
            
            stmt = stmt.order_by(asc(serie_int), asc(num_int), asc(Factura.numeroFactura))
            
            print("Generated SQL:")
            print(stmt.compile(engine))
            
            results = session.exec(stmt.limit(5)).all()
            print(f"Success! Found {len(results)} items.")
            
    except Exception as e:
        print("\nERROR DETECTED:")
        print(traceback.format_exc())
                
    except Exception as e:
        print("\nERROR DETECTED:")
        print(traceback.format_exc())

if __name__ == "__main__":
    debug_query()
