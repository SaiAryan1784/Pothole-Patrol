import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

def main():
    load_dotenv('.env')
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("DATABASE_URL is not set.")
        return

    print("Connecting to database...")
    result = urlparse(database_url)
    username = result.username
    password = result.password
    database = result.path[1:]
    hostname = result.hostname
    port = result.port

    try:
        conn = psycopg2.connect(
            database=database,
            user=username,
            password=password,
            host=hostname,
            port=port
        )
        conn.autocommit = True
        cursor = conn.cursor()
        print("Enabling PostGIS extensions...")
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis_topology;")
        print("Successfully enabled PostGIS extensions.")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
