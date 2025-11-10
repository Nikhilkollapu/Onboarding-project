import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

conn = mysql.connector.connect(
    host=os.getenv('MYSQL_HOST', 'localhost'),
    user=os.getenv('MYSQL_USER', 'root'),
    password=os.getenv('MYSQL_PASSWORD', 'root'),
    database=os.getenv('MYSQL_DATABASE', 'onboarding')
)
cursor = conn.cursor()

# Drop table if exists
cursor.execute('DROP TABLE IF EXISTS job_requirements')

# Create table with correct structure
cursor.execute("""
    CREATE TABLE job_requirements (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        client_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        required_skills TEXT,
        experience_level VARCHAR(50),
        location VARCHAR(255),
        salary_range VARCHAR(100),
        status ENUM('active', 'closed', 'draft') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users(id)
    ) ENGINE=InnoDB
""")

# Update first user to CLIENT role
cursor.execute('UPDATE users SET role = "CLIENT" WHERE id = 1')

conn.commit()
cursor.close()
conn.close()
print('Database fixed successfully!')