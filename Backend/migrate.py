"""
Database migration script — adds profile columns to the users table.
Run from the Backend/ directory:

    venv/Scripts/python.exe migrate.py

Uses IF NOT EXISTS so it's safe to run multiple times.
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

# SQLAlchemy-style postgres:// → psycopg2 accepts both, but strip quotes first
DATABASE_URL = DATABASE_URL.strip('"').strip("'")

COLUMNS = [
    ("phone",     "VARCHAR"),
    ("date_of_birth", "DATE"),
    ("age",       "INTEGER"),
    ("gender",    "VARCHAR"),
    ("symptoms",  "TEXT"),
    ("medicines", "TEXT"),
]

def run_migration():
    print(f"Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    for col_name, col_type in COLUMNS:
        sql = f'ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type};'
        print(f"  Running: {sql.strip()}")
        cur.execute(sql)
        print(f"  OK: Column '{col_name}' ensured.")

    cur.close()
    conn.close()
    print("\nMigration complete.")

if __name__ == "__main__":
    run_migration()
