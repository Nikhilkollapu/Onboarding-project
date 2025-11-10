import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def add_meeting_url_column():
    try:
        # Connect to MySQL database
        conn = mysql.connector.connect(
            host=os.getenv('MYSQL_HOST', 'localhost'),
            user=os.getenv('MYSQL_USER', 'root'),
            password=os.getenv('MYSQL_PASSWORD', 'root'),
            database=os.getenv('MYSQL_DATABASE', 'onboarding')
        )
        cursor = conn.cursor()
        
        # Check if meeting_url column exists
        cursor.execute("SHOW COLUMNS FROM interviews LIKE 'meeting_url'")
        result = cursor.fetchone()
        
        if not result:
            # Add meeting_url column to interviews table
            cursor.execute("ALTER TABLE interviews ADD COLUMN meeting_url VARCHAR(500) AFTER interview_time")
            print("Added meeting_url column to interviews table")
        else:
            print("meeting_url column already exists")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("Database migration completed successfully!")
        
    except mysql.connector.Error as e:
        print(f"MySQL Error: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_meeting_url_column()