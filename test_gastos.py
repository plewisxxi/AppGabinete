from dotenv import load_dotenv
load_dotenv('backend_python/.env')

import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend_python'))

from sqlmodel import Session, select, func, or_, cast
from app.database import engine
from app.models import Gasto
import traceback

def test_gastos():
    print("Testing list_gastos logic...")
    try:
        with Session(engine) as session:
            # 1. Base query to identify filtered Gasto IDs
            ids_stmt = select(Gasto.id)
            filtered_ids = ids_stmt.subquery()
            
            # 2. TOTAL COUNT (filtered)
            total_count = session.exec(select(func.count()).select_from(filtered_ids)).one()
            print(f"Total count: {total_count}")
            
            # 3. ACCURATE AGGREGATES
            from sqlalchemy import select as sa_select
            agg_stmt = sa_select(
                func.coalesce(func.sum(Gasto.totalPagado), 0),
                func.coalesce(func.sum(Gasto.total), 0)
            ).where(Gasto.id.in_(select(filtered_ids.c.id)))
            
            aggs = session.exec(agg_stmt).one()
            print(f"Aggregates: {aggs}")
            
            # 4. FINAL DATA RETRIEVAL (test global search)
            q = "test" # or some string you expect to find
            ors = []
            from sqlalchemy import String
            for col_obj in Gasto.__table__.columns:
                try:
                    # Check if cast and String are available
                    ors.append(func.unaccent(cast(getattr(Gasto, col_obj.name), String)).ilike(func.unaccent(f"%{q}%")))
                except Exception as e:
                    print(f"Skipping column {col_obj.name}: {e}")
            
            if ors:
                stmt_q = select(Gasto).where(or_(*ors))
                results_q = session.exec(stmt_q.limit(5)).all()
                print(f"Global search results: {len(results_q)}")

            # 5. ACTUAL DATA RETRIEVAL
            stmt = select(Gasto).where(Gasto.id.in_(select(filtered_ids.c.id)))
            results = session.exec(stmt.limit(5)).all()
            print(f"Results: {len(results)} items found.")
            for g in results:
                print(f"  ID: {g.id}, Total: {g.total}, Pagado: {g.totalPagado}")
            
    except Exception as e:
        print("\nERROR DETECTED:")
        print(traceback.format_exc())

if __name__ == "__main__":
    test_gastos()
