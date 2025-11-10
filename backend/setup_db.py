import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def setup_database():
    try:
        # Connect to MySQL server (without specifying database)
        conn = mysql.connector.connect(
            host=os.getenv('MYSQL_HOST', 'localhost'),
            user=os.getenv('MYSQL_USER', 'root'),
            password=os.getenv('MYSQL_PASSWORD', 'root')
        )
        cursor = conn.cursor()
        
        # Create database if it doesn't exist
        database_name = os.getenv('MYSQL_DATABASE', 'onboarding')
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {database_name}")
        cursor.execute(f"USE {database_name}")
        
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('CANDIDATE', 'HR', 'CLIENT') DEFAULT 'CANDIDATE',
                dob DATE NULL,
                address TEXT NULL,
                resume_path VARCHAR(500) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create candidate profiles table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS candidate_profiles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                dob DATE NULL,
                address TEXT NULL,
                resume_path VARCHAR(500) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            ) ENGINE=InnoDB
        """)
        
        # Create job requirements table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS job_requirements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_id INT NOT NULL,
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
        
        # Create interviews table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS interviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                requirement_id INT NOT NULL,
                candidate_id INT NOT NULL,
                client_id INT NOT NULL,
                hr_id INT NOT NULL,
                interview_date DATE,
                interview_time TIME,
                meeting_url VARCHAR(500),
                status ENUM('scheduled', 'pending_client', 'completed', 'cancelled') DEFAULT 'pending_client',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (requirement_id) REFERENCES job_requirements(id),
                FOREIGN KEY (candidate_id) REFERENCES users(id),
                FOREIGN KEY (client_id) REFERENCES users(id),
                FOREIGN KEY (hr_id) REFERENCES users(id)
            ) ENGINE=InnoDB
        """)
        
        # Create interview results table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS interview_results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                interview_id INT NOT NULL,
                decision ENUM('accepted', 'rejected') NOT NULL,
                feedback TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (interview_id) REFERENCES interviews(id)
            ) ENGINE=InnoDB
        """)
        
        # Create BGV table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bgv_forms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                candidate_id INT NOT NULL,
                interview_id INT NOT NULL,
                education TEXT,
                criminal_background ENUM('yes', 'no') NOT NULL,
                status ENUM('pending', 'submitted') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_candidate_interview (candidate_id, interview_id),
                FOREIGN KEY (candidate_id) REFERENCES users(id),
                FOREIGN KEY (interview_id) REFERENCES interviews(id)
            ) ENGINE=InnoDB
        """)
        
        # Create vendor checklist table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vendor_checklists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                candidate_id INT NOT NULL,
                interview_id INT NOT NULL,
                legal_documents ENUM('yes', 'no') NOT NULL,
                onboarding_training ENUM('yes', 'no') NOT NULL,
                security_policies ENUM('yes', 'no') NOT NULL,
                sla_kpi_defined ENUM('yes', 'no') NOT NULL,
                status ENUM('pending', 'completed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_vendor_checklist (candidate_id, interview_id),
                FOREIGN KEY (candidate_id) REFERENCES users(id),
                FOREIGN KEY (interview_id) REFERENCES interviews(id)
            ) ENGINE=InnoDB
        """)
        
        # Create BGV popup tracking table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bgv_popup_shown (
                id INT AUTO_INCREMENT PRIMARY KEY,
                candidate_id INT NOT NULL,
                interview_id INT NOT NULL,
                shown_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_popup_shown (candidate_id, interview_id),
                FOREIGN KEY (candidate_id) REFERENCES users(id),
                FOREIGN KEY (interview_id) REFERENCES interviews(id)
            ) ENGINE=InnoDB
        """)
        
        # Create onboarding confirmations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS onboarding_confirmations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                candidate_id INT NOT NULL,
                interview_id INT NOT NULL,
                client_id INT NOT NULL,
                confirmation ENUM('yes', 'no') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_onboarding_confirmation (candidate_id, interview_id),
                FOREIGN KEY (candidate_id) REFERENCES users(id),
                FOREIGN KEY (interview_id) REFERENCES interviews(id),
                FOREIGN KEY (client_id) REFERENCES users(id)
            ) ENGINE=InnoDB
        """)
        
        # Create asset provisions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS asset_provisions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                candidate_id INT NOT NULL,
                interview_id INT NOT NULL,
                hr_id INT NOT NULL,
                assets_provided ENUM('yes', 'no') DEFAULT 'no',
                asset_details TEXT,
                provided_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_asset_provision (candidate_id, interview_id),
                FOREIGN KEY (candidate_id) REFERENCES users(id),
                FOREIGN KEY (interview_id) REFERENCES interviews(id),
                FOREIGN KEY (hr_id) REFERENCES users(id)
            ) ENGINE=InnoDB
        """)
        
        # Create clients table for additional client information
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                company_name VARCHAR(255),
                industry VARCHAR(100),
                company_size VARCHAR(50),
                website VARCHAR(255),
                phone VARCHAR(20),
                address TEXT,
                contact_person VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            ) ENGINE=InnoDB
        """)
        
        conn.commit()
        cursor.close()
        conn.close()
        print(f"Database '{database_name}' and all tables created successfully!")
        
    except mysql.connector.Error as e:
        print(f"MySQL Error: {e}")
        print("Make sure MySQL is running and credentials in .env are correct")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    setup_database()