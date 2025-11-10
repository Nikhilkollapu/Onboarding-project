import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def clear_all_data():
    try:
        # Connect to MySQL database
        conn = mysql.connector.connect(
            host=os.getenv('MYSQL_HOST', 'localhost'),
            user=os.getenv('MYSQL_USER', 'root'),
            password=os.getenv('MYSQL_PASSWORD', 'root'),
            database=os.getenv('MYSQL_DATABASE', 'onboarding')
        )
        cursor = conn.cursor()
        
        # Disable foreign key checks temporarily
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        
        # Clear all tables in correct order (child tables first)
        tables_to_clear = [
            'asset_provisions',
            'onboarding_confirmations', 
            'bgv_popup_shown',
            'vendor_checklists',
            'bgv_forms',
            'interview_results',
            'interviews',
            'job_requirements',
            'candidate_profiles',
            'clients',
            'users'
        ]
        
        for table in tables_to_clear:
            cursor.execute(f"DELETE FROM {table}")
            print(f"Cleared data from {table}")
        
        # Re-enable foreign key checks
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("All data cleared successfully!")
        
    except mysql.connector.Error as e:
        print(f"MySQL Error: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    clear_all_data()