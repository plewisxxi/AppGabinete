from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text('ALTER TABLE metadatos ADD COLUMN serieRectificativa VARCHAR'))
        conn.commit()
        print('Column added successfully')
    except Exception as e:
        print('Error:', e)
