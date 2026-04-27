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
    ("reset_otp", "VARCHAR(6)"),
    ("reset_otp_expires_at", "TIMESTAMP WITH TIME ZONE"),
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

    # Remove unique constraint/index from username (handle legacy + Prisma/custom names)
    print("Removing unique constraint/index from users.username if it exists...")
    try:
        cur.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key CASCADE;")
        print("  OK: Dropped constraint users_username_key")
    except Exception as e:
        print(f"  Warning dropping constraint: {e}")

    try:
        cur.execute("DROP INDEX IF EXISTS ix_users_username CASCADE;")
        print("  OK: Dropped index ix_users_username")
    except Exception as e:
        print(f"  Warning dropping index: {e}")

    # Drop any other UNIQUE constraints touching users.username
    try:
        cur.execute(
            """
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name
             AND tc.table_schema = ccu.table_schema
            WHERE tc.table_schema = 'public'
              AND tc.table_name = 'users'
              AND tc.constraint_type = 'UNIQUE'
              AND ccu.column_name = 'username';
            """
        )
        unique_constraints = [row[0] for row in cur.fetchall()]
        for constraint_name in unique_constraints:
            cur.execute(f'ALTER TABLE users DROP CONSTRAINT IF EXISTS "{constraint_name}" CASCADE;')
            print(f"  OK: Dropped UNIQUE constraint {constraint_name}")
    except Exception as e:
        print(f"  Warning dropping dynamic UNIQUE constraints: {e}")

    # Drop any UNIQUE indexes touching users.username
    try:
        cur.execute(
            """
            SELECT i.relname
            FROM pg_index x
            JOIN pg_class t ON t.oid = x.indrelid
            JOIN pg_class i ON i.oid = x.indexrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(x.indkey)
            WHERE n.nspname = 'public'
              AND t.relname = 'users'
              AND a.attname = 'username'
              AND x.indisunique = true;
            """
        )
        unique_indexes = [row[0] for row in cur.fetchall()]
        for index_name in unique_indexes:
            cur.execute(f'DROP INDEX IF EXISTS "{index_name}" CASCADE;')
            print(f"  OK: Dropped UNIQUE index {index_name}")
    except Exception as e:
        print(f"  Warning dropping dynamic UNIQUE indexes: {e}")

    print("  OK: Username uniqueness/index constraints removed (not recreated).")

    cur.close()
    conn.close()
    print("\nMigration complete.")

if __name__ == "__main__":
    run_migration()
