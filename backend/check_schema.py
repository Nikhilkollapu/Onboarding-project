import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

try:
    conn = mysql.connector.connect(
        host=os.getenv('MYSQL_HOST', 'localhost'),
        user=os.getenv('MYSQL_USER', 'root'),
        password=os.getenv('MYSQL_PASSWORD', 'root'),
        database=os.getenv('MYSQL_DATABASE', 'onboarding')
    )
    cursor = conn.cursor()
    
    # Check if users table exists
    cursor.execute("SHOW TABLES LIKE 'users'")
    table_exists = cursor.fetchone()
    print(f"Users table exists: {bool(table_exists)}")
    
    if table_exists:
        # Check table structure
        cursor.execute("DESCRIBE users")
        columns = cursor.fetchall()
        print("Users table structure:")
        for col in columns:
            print(f"  {col}")
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")