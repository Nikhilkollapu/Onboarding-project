import os
import io
import json
import traceback
import hashlib
import jwt
import mysql.connector
import uuid
from datetime import datetime, timedelta
from flask import request, jsonify, Flask, send_file
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# instantiate Flask app so decorators work at import time
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fallback-secret-key')

# Enable CORS
CORS(app, origins=os.getenv('CORS_ORIGIN', 'http://localhost:3000'))

try:
    import google.generativeai as genai
except Exception:
    genai = None
try:
    from PyPDF2 import PdfReader
except Exception:
    PdfReader = None
try:
    from docx import Document
except Exception:
    Document = None

# configure generative AI client if env var present
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GOOGLE_API_KEYS")  # support common names
GOOGLE_MODEL = os.getenv("GOOGLE_MODEL") or "gemini-1.5-flash"
if genai and GOOGLE_API_KEY:
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
    except Exception:
        app.logger.warning("Failed to configure google.generativeai client")

def _extract_text_from_pdf_bytes(b: bytes) -> str:
    if not PdfReader:
        raise RuntimeError("PyPDF2 not installed")
    reader = PdfReader(io.BytesIO(b))
    texts = []
    for p in reader.pages:
        try:
            texts.append(p.extract_text() or "")
        except Exception:
            continue
    return "\n".join(texts).strip()

def _extract_text_from_docx_bytes(b: bytes) -> str:
    if not Document:
        raise RuntimeError("python-docx not installed")
    # Document can accept a file-like object
    doc = Document(io.BytesIO(b))
    texts = [p.text for p in doc.paragraphs]
    return "\n".join(texts).strip()

def _extract_skills_with_keywords(text: str) -> list:
    """Extract skills using comprehensive keyword matching"""
    # Comprehensive skills database
    skills_db = {
        # Programming Languages
        'python': 'Python', 'java': 'Java', 'javascript': 'JavaScript', 'js': 'JavaScript',
        'typescript': 'TypeScript', 'c++': 'C++', 'cpp': 'C++', 'c#': 'C#', 'csharp': 'C#',
        'php': 'PHP', 'ruby': 'Ruby', 'go': 'Go', 'golang': 'Go', 'rust': 'Rust',
        'swift': 'Swift', 'kotlin': 'Kotlin', 'scala': 'Scala', 'r': 'R', 'matlab': 'MATLAB',
        'perl': 'Perl', 'shell': 'Shell Scripting', 'bash': 'Bash', 'powershell': 'PowerShell',
        
        # Web Technologies
        'html': 'HTML', 'css': 'CSS', 'react': 'React', 'reactjs': 'React', 'angular': 'Angular',
        'vue': 'Vue.js', 'vuejs': 'Vue.js', 'node.js': 'Node.js', 'nodejs': 'Node.js',
        'express': 'Express.js', 'django': 'Django', 'flask': 'Flask', 'spring': 'Spring',
        'bootstrap': 'Bootstrap', 'tailwind': 'Tailwind CSS', 'sass': 'SASS', 'less': 'LESS',
        'jquery': 'jQuery', 'webpack': 'Webpack', 'babel': 'Babel', 'npm': 'NPM', 'yarn': 'Yarn',
        
        # Databases
        'mysql': 'MySQL', 'postgresql': 'PostgreSQL', 'postgres': 'PostgreSQL', 'mongodb': 'MongoDB',
        'redis': 'Redis', 'sqlite': 'SQLite', 'oracle': 'Oracle', 'sql server': 'SQL Server',
        'cassandra': 'Cassandra', 'elasticsearch': 'Elasticsearch', 'dynamodb': 'DynamoDB',
        
        # Cloud & DevOps
        'aws': 'AWS', 'amazon web services': 'AWS', 'azure': 'Azure', 'gcp': 'Google Cloud',
        'google cloud': 'Google Cloud', 'docker': 'Docker', 'kubernetes': 'Kubernetes',
        'jenkins': 'Jenkins', 'git': 'Git', 'github': 'GitHub', 'gitlab': 'GitLab',
        'terraform': 'Terraform', 'ansible': 'Ansible', 'chef': 'Chef', 'puppet': 'Puppet',
        'ci/cd': 'CI/CD', 'devops': 'DevOps', 'linux': 'Linux', 'ubuntu': 'Ubuntu',
        'centos': 'CentOS', 'windows': 'Windows', 'nginx': 'Nginx', 'apache': 'Apache',
        
        # Data Science & AI
        'machine learning': 'Machine Learning', 'ml': 'Machine Learning', 'ai': 'Artificial Intelligence',
        'artificial intelligence': 'Artificial Intelligence', 'data science': 'Data Science',
        'tensorflow': 'TensorFlow', 'pytorch': 'PyTorch', 'pandas': 'Pandas', 'numpy': 'NumPy',
        'scikit-learn': 'Scikit-learn', 'keras': 'Keras', 'opencv': 'OpenCV', 'nlp': 'NLP',
        'natural language processing': 'NLP', 'deep learning': 'Deep Learning',
        
        # Mobile Development
        'android': 'Android', 'ios': 'iOS', 'react native': 'React Native', 'flutter': 'Flutter',
        'xamarin': 'Xamarin', 'ionic': 'Ionic',
        
        # Testing
        'junit': 'JUnit', 'selenium': 'Selenium', 'cypress': 'Cypress', 'jest': 'Jest',
        'mocha': 'Mocha', 'pytest': 'PyTest', 'testing': 'Testing', 'unit testing': 'Unit Testing',
        
        # Soft Skills
        'project management': 'Project Management', 'agile': 'Agile', 'scrum': 'Scrum',
        'leadership': 'Leadership', 'communication': 'Communication', 'teamwork': 'Teamwork',
        'problem solving': 'Problem Solving', 'analytical': 'Analytical Skills',
        
        # Other Technologies
        'rest api': 'REST API', 'restful': 'REST API', 'graphql': 'GraphQL',
        'microservices': 'Microservices', 'api': 'API Development', 'json': 'JSON',
        'xml': 'XML', 'soap': 'SOAP', 'oauth': 'OAuth', 'jwt': 'JWT'
    }
    
    found_skills = set()
    text_lower = text.lower()
    
    # Direct keyword matching
    for keyword, skill_name in skills_db.items():
        if keyword in text_lower:
            found_skills.add(skill_name)
    
    # Pattern matching for common skill formats
    import re
    
    # Match patterns like "Experience in Python" or "Proficient in Java"
    skill_patterns = [
        r'experience (?:in|with) ([a-zA-Z+#.\s]+)',
        r'proficient (?:in|with) ([a-zA-Z+#.\s]+)',
        r'skilled (?:in|with) ([a-zA-Z+#.\s]+)',
        r'knowledge (?:of|in) ([a-zA-Z+#.\s]+)',
        r'expertise (?:in|with) ([a-zA-Z+#.\s]+)',
        r'familiar (?:with) ([a-zA-Z+#.\s]+)',
        r'worked (?:with|on) ([a-zA-Z+#.\s]+)',
        r'using ([a-zA-Z+#.\s]+)',
        r'technologies:?\s*([a-zA-Z+#.,\s]+)',
        r'skills:?\s*([a-zA-Z+#.,\s]+)',
        r'programming languages:?\s*([a-zA-Z+#.,\s]+)'
    ]
    
    for pattern in skill_patterns:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        for match in matches:
            # Split by common separators and clean
            potential_skills = re.split(r'[,;\n\r]+', match)
            for skill in potential_skills:
                skill = skill.strip().strip('.')
                if len(skill) > 1 and len(skill) < 30:
                    # Check if it matches any known skill
                    skill_lower = skill.lower()
                    if skill_lower in skills_db:
                        found_skills.add(skills_db[skill_lower])
                    elif len(skill) > 2:  # Add unknown but reasonable skills
                        found_skills.add(skill.title())
    
    return list(found_skills)

def _call_gen_ai_for_skills(text: str) -> list:
    skills = []
    
    # Try AI extraction first with better prompting
    if genai and GOOGLE_API_KEY:
        prompt = (
            "You are an expert resume parser. Extract ALL technical skills, programming languages, "
            "frameworks, tools, databases, cloud platforms, and relevant technologies from this resume text. "
            "Include both hard technical skills and relevant soft skills. "
            "Return ONLY a JSON array of skill names, no other text or explanation. "
            "Example format: [\"Python\", \"React\", \"AWS\", \"Machine Learning\"]\n\n"
            f"Resume text:\n{text[:4000]}"
        )
        try:
            model = genai.GenerativeModel(GOOGLE_MODEL)
            resp = model.generate_content(prompt)
            ai_text = resp.text if hasattr(resp, 'text') else str(resp)
            
            # Clean and parse AI response
            ai_text = ai_text.strip()
            
            # Try to extract JSON array from response
            import re
            json_match = re.search(r'\[.*?\]', ai_text, re.DOTALL)
            if json_match:
                try:
                    skills = json.loads(json_match.group())
                    if isinstance(skills, list):
                        skills = [s.strip() for s in skills if isinstance(s, str) and len(s.strip()) > 1]
                except:
                    skills = []
            
            # If JSON parsing failed, try line-by-line extraction
            if not skills:
                lines = ai_text.split('\n')
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith('[') and not line.startswith('{'):
                        # Remove common prefixes and clean
                        line = re.sub(r'^[\d\-\*\•\.\s]+', '', line)
                        if len(line) > 1 and len(line) < 50:
                            skills.append(line)
            
        except Exception as e:
            app.logger.exception("AI call failed")
            skills = []
    
    # Always combine with keyword matching for comprehensive results
    keyword_skills = _extract_skills_with_keywords(text)
    
    # Merge AI and keyword results
    all_skills = skills + keyword_skills
    
    # Advanced deduplication and cleaning
    cleaned = []
    seen = set()
    
    for skill in all_skills:
        if not skill or not isinstance(skill, str):
            continue
            
        # Clean the skill name
        skill = skill.strip().strip('.,;:"\'')
        if len(skill) < 2 or len(skill) > 50:
            continue
            
        # Normalize for comparison
        skill_lower = skill.lower()
        
        # Skip if already seen (case-insensitive)
        if skill_lower in seen:
            continue
            
        # Skip common non-skills
        skip_words = {'experience', 'years', 'months', 'level', 'basic', 'advanced', 
                     'intermediate', 'beginner', 'expert', 'good', 'excellent', 'strong'}
        if skill_lower in skip_words:
            continue
            
        seen.add(skill_lower)
        cleaned.append(skill)
    
    # Sort by relevance (technical skills first)
    technical_keywords = {'python', 'java', 'javascript', 'react', 'angular', 'vue', 
                         'node', 'django', 'flask', 'spring', 'aws', 'azure', 'docker', 
                         'kubernetes', 'mysql', 'mongodb', 'git', 'linux'}
    
    def skill_priority(skill):
        skill_lower = skill.lower()
        if any(tech in skill_lower for tech in technical_keywords):
            return 0  # High priority
        elif any(char in skill_lower for char in ['.', '+', '#']):
            return 1  # Medium priority (likely technical)
        else:
            return 2  # Lower priority
    
    cleaned.sort(key=skill_priority)
    
    return cleaned[:25]  # Return top 25 skills

# Verify JWT token
def verify_token():
    auth = request.headers.get('Authorization')
    if not auth or not auth.startswith('Bearer '):
        return None
    token = auth.split(' ')[1]
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except:
        return None

@app.route('/candidate/profile', methods=['GET', 'POST'])
def candidate_profile():
    try:
        # Verify authentication
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        user_id = payload['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if request.method == 'GET':
            # Get profile data from candidate_profiles table
            cursor.execute(
                'SELECT name, email, dob, address, resume_path FROM candidate_profiles WHERE user_id = %s',
                (user_id,)
            )
            profile = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if not profile:
                return jsonify({'message': 'Profile not found'}), 404
                
            return jsonify({
                'name': profile[0],
                'email': profile[1], 
                'dob': profile[2].isoformat() if profile[2] else None,
                'address': profile[3],
                'resume_path': profile[4]
            })
            
        elif request.method == 'POST':
            # Update profile
            name = request.form.get('name', '').strip()
            email = request.form.get('email', '').strip()
            dob = request.form.get('dob') or None
            address = request.form.get('address', '').strip()
            
            resume_path = None
            if 'resume' in request.files:
                resume_file = request.files['resume']
                if resume_file.filename:
                    # Save resume file
                    filename = f"u{user_id}_{int(datetime.now().timestamp())}_{resume_file.filename}"
                    resume_path = os.path.join('uploads', filename)
                    os.makedirs('uploads', exist_ok=True)
                    resume_file.save(resume_path)
            
            # Update candidate_profiles table
            if resume_path:
                cursor.execute(
                    'UPDATE candidate_profiles SET name=%s, email=%s, dob=%s, address=%s, resume_path=%s WHERE user_id=%s',
                    (name, email, dob, address, resume_path, user_id)
                )
            else:
                cursor.execute(
                    'UPDATE candidate_profiles SET name=%s, email=%s, dob=%s, address=%s WHERE user_id=%s',
                    (name, email, dob, address, user_id)
                )
                
            conn.commit()
            cursor.close()
            conn.close()
            
            # Extract skills if resume was uploaded
            skills = []
            if resume_path:
                try:
                    with open(resume_path, 'rb') as f:
                        content = f.read()
                    
                    # Extract text from resume
                    text = ""
                    filename = resume_path.lower()
                    if filename.endswith(".pdf") or (content and content[:4] == b"%PDF"):
                        text = _extract_text_from_pdf_bytes(content)
                    elif filename.endswith(".docx") or filename.endswith(".doc"):
                        text = _extract_text_from_docx_bytes(content)
                    
                    if text:
                        skills = _call_gen_ai_for_skills(text)
                except Exception as e:
                    app.logger.exception("Skill extraction failed")
            
            return jsonify({
                'message': 'Profile updated successfully',
                'skills': skills
            })
            
    except Exception as e:
        app.logger.exception('Profile operation failed')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/candidate/skills', methods=['POST'])
def candidate_skills():
    """
    POST /candidate/skills
    - Accepts a multipart/form-data upload with field 'resume' (PDF or DOCX).
    - Returns JSON: { "skills": [ "...", ... ] }
    - Requires Authorization header with Bearer token.
    """
    try:
        # Verify authentication
        payload = verify_token()
        if not payload:
            return jsonify({"message": "Missing or invalid token"}), 401
            
        user_id = payload['user_id']
        
        # Check if resume file is uploaded or use existing resume
        resume_file = request.files.get("resume")
        
        if resume_file:
            # Use uploaded file
            content = resume_file.read()
            filename = (resume_file.filename or "").lower()
        else:
            # Try to use existing resume from profile
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('SELECT resume_path FROM candidate_profiles WHERE user_id = %s', (user_id,))
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if not result or not result[0]:
                return jsonify({"message": "No resume file found. Please upload a resume first."}), 400
                
            try:
                with open(result[0], 'rb') as f:
                    content = f.read()
                filename = result[0].lower()
            except FileNotFoundError:
                return jsonify({"message": "Resume file not found on server."}), 400

        text = ""
        if filename.endswith(".pdf") or (content and content[:4] == b"%PDF"):
            try:
                text = _extract_text_from_pdf_bytes(content)
            except Exception as e:
                app.logger.exception("PDF text extraction failed")
                return jsonify({"error": "Failed to extract text from PDF", "trace": traceback.format_exc()}), 500
        elif filename.endswith(".docx") or filename.endswith(".doc"):
            try:
                text = _extract_text_from_docx_bytes(content)
            except Exception as e:
                app.logger.exception("DOCX text extraction failed")
                return jsonify({"error": "Failed to extract text from DOCX", "trace": traceback.format_exc()}), 500
        else:
            # try PDF extraction as fallback
            try:
                text = _extract_text_from_pdf_bytes(content)
            except Exception:
                try:
                    text = _extract_text_from_docx_bytes(content)
                except Exception:
                    return jsonify({"error": "Unsupported resume format; upload PDF or DOCX"}), 400

        if not text:
            return jsonify({"skills": []})

        # call AI / heuristic to extract skills
        try:
            skills = _call_gen_ai_for_skills(text)
        except Exception as e:
            app.logger.exception("AI skill extraction failed")
            return jsonify({"error": "AI extraction failed", "trace": traceback.format_exc()}), 500

        return jsonify({"skills": skills})
    except Exception as e:
        app.logger.exception("candidate_skills top-level failure")
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    try:
        file_path = os.path.join('uploads', filename)
        if os.path.exists(file_path):
            return send_file(file_path)
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/hr/candidates', methods=['GET'])
def get_all_candidates():
    try:
        # Verify authentication
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all candidates with their profiles
        cursor.execute(
            "SELECT id, name, email FROM users WHERE role = 'CANDIDATE' ORDER BY id DESC"
        )
        
        candidates = cursor.fetchall()
        
        result = []
        for candidate in candidates:
            # Get profile data for each candidate
            cursor.execute(
                "SELECT dob, address, resume_path FROM candidate_profiles WHERE user_id = %s",
                (candidate[0],)
            )
            profile = cursor.fetchone()
            
            # Extract skills if resume exists
            skills = []
            if profile and profile[2]:  # resume_path exists
                try:
                    with open(profile[2], 'rb') as f:
                        content = f.read()
                    
                    # Extract text from resume
                    text = ""
                    filename = profile[2].lower()
                    if filename.endswith(".pdf") or (content and content[:4] == b"%PDF"):
                        text = _extract_text_from_pdf_bytes(content)
                    elif filename.endswith(".docx") or filename.endswith(".doc"):
                        text = _extract_text_from_docx_bytes(content)
                    
                    if text:
                        skills = _call_gen_ai_for_skills(text)
                except Exception as e:
                    app.logger.exception(f"Skill extraction failed for candidate {candidate[0]}")
                    skills = []
            
            result.append({
                'id': candidate[0],
                'name': candidate[1],
                'email': candidate[2],
                'created_at': None,
                'dob': profile[0].isoformat() if profile and profile[0] else None,
                'address': profile[1] if profile and profile[1] else None,
                'resume_path': profile[2] if profile and profile[2] else None,
                'has_resume': bool(profile and profile[2]),
                'skills': skills
            })
        
        cursor.close()
        conn.close()
            
        return jsonify({'candidates': result})
        
    except Exception as e:
        app.logger.exception('Failed to get candidates')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/client/profile', methods=['GET', 'POST'])
def client_profile():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        user_id = payload['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if request.method == 'GET':
            # Get client profile
            cursor.execute(
                'SELECT company_name, industry, company_size, website, phone, address, contact_person FROM clients WHERE user_id = %s',
                (user_id,)
            )
            profile = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if not profile:
                return jsonify({
                    'company_name': '',
                    'industry': '',
                    'company_size': '',
                    'website': '',
                    'phone': '',
                    'address': '',
                    'contact_person': payload.get('name', '')
                })
                
            return jsonify({
                'company_name': profile[0] or '',
                'industry': profile[1] or '',
                'company_size': profile[2] or '',
                'website': profile[3] or '',
                'phone': profile[4] or '',
                'address': profile[5] or '',
                'contact_person': profile[6] or ''
            })
            
        elif request.method == 'POST':
            data = request.get_json()
            company_name = data.get('company_name', '').strip()
            industry = data.get('industry', '').strip()
            company_size = data.get('company_size', '').strip()
            website = data.get('website', '').strip()
            phone = data.get('phone', '').strip()
            address = data.get('address', '').strip()
            contact_person = data.get('contact_person', '').strip()
            
            # Check if profile exists
            cursor.execute('SELECT id FROM clients WHERE user_id = %s', (user_id,))
            existing = cursor.fetchone()
            
            if existing:
                cursor.execute(
                    'UPDATE clients SET company_name=%s, industry=%s, company_size=%s, website=%s, phone=%s, address=%s, contact_person=%s WHERE user_id=%s',
                    (company_name, industry, company_size, website, phone, address, contact_person, user_id)
                )
            else:
                cursor.execute(
                    'INSERT INTO clients (user_id, company_name, industry, company_size, website, phone, address, contact_person) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)',
                    (user_id, company_name, industry, company_size, website, phone, address, contact_person)
                )
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'message': 'Profile updated successfully'})
            
    except Exception as e:
        app.logger.exception('Client profile operation failed')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/client/requirements', methods=['GET', 'POST'])
def client_requirements():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        user_id = payload['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if request.method == 'GET':
            # Get all requirements for this client with candidate assignment status
            cursor.execute("""
                SELECT jr.id, jr.title, jr.description, jr.required_skills, 
                       jr.experience_level, jr.location, jr.salary_range, 
                       jr.status, jr.created_at,
                       COUNT(i.id) as candidate_count
                FROM job_requirements jr
                LEFT JOIN interviews i ON jr.id = i.requirement_id
                WHERE jr.client_id = %s
                GROUP BY jr.id
                ORDER BY jr.created_at DESC
            """, (user_id,))
            
            requirements = cursor.fetchall()
            cursor.close()
            conn.close()
            
            pending = []
            completed = []
            
            for req in requirements:
                req_data = {
                    'id': req[0],
                    'title': req[1],
                    'description': req[2],
                    'required_skills': json.loads(req[3]) if req[3] else [],
                    'experience_level': req[4],
                    'location': req[5],
                    'salary_range': req[6],
                    'status': req[7],
                    'created_at': req[8].isoformat() if req[8] else None,
                    'candidate_count': req[9]
                }
                
                if req[9] > 0:  # Has candidates assigned
                    completed.append(req_data)
                else:  # No candidates assigned
                    pending.append(req_data)
            
            return jsonify({
                'pending': pending,
                'completed': completed
            })
            
        elif request.method == 'POST':
            # Create new requirement
            data = request.get_json()
            title = data.get('title', '').strip()
            description = data.get('description', '').strip()
            required_skills = data.get('required_skills', [])
            experience_level = data.get('experience_level', '').strip()
            location = data.get('location', '').strip()
            salary_range = data.get('salary_range', '').strip()
            
            if not title:
                return jsonify({'message': 'Title is required'}), 400
                
            cursor.execute(
                'INSERT INTO job_requirements (client_id, title, description, required_skills, experience_level, location, salary_range) VALUES (%s, %s, %s, %s, %s, %s, %s)',
                (user_id, title, description, json.dumps(required_skills), experience_level, location, salary_range)
            )
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'message': 'Requirement created successfully'}), 201
            
    except Exception as e:
        app.logger.exception('Requirements operation failed')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/hr/job-postings', methods=['GET'])
def get_job_postings():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all job requirements with client information
        cursor.execute("""
            SELECT jr.id, jr.title, jr.description, jr.required_skills, 
                   jr.experience_level, jr.location, jr.salary_range, 
                   jr.status, jr.created_at, u.name as client_name, u.email as client_email
            FROM job_requirements jr
            JOIN users u ON jr.client_id = u.id
            ORDER BY jr.created_at DESC
        """)
        
        postings = cursor.fetchall()
        cursor.close()
        conn.close()
        
        result = []
        for posting in postings:
            result.append({
                'id': posting[0],
                'title': posting[1],
                'description': posting[2],
                'required_skills': json.loads(posting[3]) if posting[3] else [],
                'experience_level': posting[4],
                'location': posting[5],
                'salary_range': posting[6],
                'status': posting[7],
                'created_at': posting[8].isoformat() if posting[8] else None,
                'client_name': posting[9],
                'client_email': posting[10]
            })
            
        return jsonify({'postings': result})
        
    except Exception as e:
        app.logger.exception('Failed to get job postings')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/hr/shortlisted-candidates', methods=['GET'])
def get_shortlisted_candidates():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all active job requirements
        cursor.execute(
            'SELECT id, title, required_skills FROM job_requirements WHERE status = "active"'
        )
        requirements = cursor.fetchall()
        
        # Get all candidates with their skills
        cursor.execute(
            'SELECT id, name, email FROM users WHERE role = "CANDIDATE" ORDER BY id DESC'
        )
        candidates = cursor.fetchall()
        
        shortlisted = []
        
        for req in requirements:
            req_id, req_title, req_skills_json = req
            req_skills = json.loads(req_skills_json) if req_skills_json else []
            
            if not req_skills:
                continue
                
            req_candidates = []
            
            for candidate in candidates:
                candidate_id, candidate_name, candidate_email = candidate
                
                # Get candidate profile
                cursor.execute(
                    'SELECT dob, address, resume_path FROM candidate_profiles WHERE user_id = %s',
                    (candidate_id,)
                )
                profile = cursor.fetchone()
                
                # Extract candidate skills
                candidate_skills = []
                if profile and profile[2]:  # resume_path exists
                    try:
                        with open(profile[2], 'rb') as f:
                            content = f.read()
                        
                        text = ""
                        filename = profile[2].lower()
                        if filename.endswith(".pdf") or (content and content[:4] == b"%PDF"):
                            text = _extract_text_from_pdf_bytes(content)
                        elif filename.endswith(".docx") or filename.endswith(".doc"):
                            text = _extract_text_from_docx_bytes(content)
                        
                        if text:
                            candidate_skills = _call_gen_ai_for_skills(text)
                    except Exception as e:
                        app.logger.exception(f"Skill extraction failed for candidate {candidate_id}")
                        candidate_skills = []
                
                # Calculate skill match percentage
                if candidate_skills:
                    matched_skills = []
                    for req_skill in req_skills:
                        for cand_skill in candidate_skills:
                            if req_skill.lower() in cand_skill.lower() or cand_skill.lower() in req_skill.lower():
                                matched_skills.append(req_skill)
                                break
                    
                    match_percentage = (len(matched_skills) / len(req_skills)) * 100 if req_skills else 0
                    
                    # Only include candidates with at least 30% match
                    if match_percentage >= 30:
                        req_candidates.append({
                            'id': candidate_id,
                            'name': candidate_name,
                            'email': candidate_email,
                            'dob': profile[0].isoformat() if profile and profile[0] else None,
                            'address': profile[1] if profile and profile[1] else None,
                            'resume_path': profile[2] if profile and profile[2] else None,
                            'skills': candidate_skills,
                            'matched_skills': matched_skills,
                            'match_percentage': round(match_percentage, 1)
                        })
            
            # Sort by match percentage (highest first)
            req_candidates.sort(key=lambda x: x['match_percentage'], reverse=True)
            
            if req_candidates:
                shortlisted.append({
                    'requirement_id': req_id,
                    'requirement_title': req_title,
                    'required_skills': req_skills,
                    'candidates': req_candidates
                })
        
        cursor.close()
        conn.close()
        
        return jsonify({'shortlisted': shortlisted})
        
    except Exception as e:
        app.logger.exception('Failed to get shortlisted candidates')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/hr/schedule-interview', methods=['POST'])
def schedule_interview():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        data = request.get_json()
        requirement_id = data.get('requirement_id')
        candidate_id = data.get('candidate_id')
        
        if not requirement_id or not candidate_id:
            return jsonify({'message': 'Requirement ID and Candidate ID are required'}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get client_id from requirement
        cursor.execute('SELECT client_id FROM job_requirements WHERE id = %s', (requirement_id,))
        result = cursor.fetchone()
        if not result:
            return jsonify({'message': 'Job requirement not found'}), 404
            
        client_id = result[0]
        hr_id = payload['user_id']
        
        # Create interview record
        cursor.execute(
            'INSERT INTO interviews (requirement_id, candidate_id, client_id, hr_id, status) VALUES (%s, %s, %s, %s, %s)',
            (requirement_id, candidate_id, client_id, hr_id, 'pending_client')
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Interview scheduled successfully. Waiting for client to set time.'}), 201
        
    except Exception as e:
        app.logger.exception('Failed to schedule interview')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/client/pending-interviews', methods=['GET'])
def get_pending_interviews():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        client_id = payload['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT i.id, i.requirement_id, i.candidate_id, i.status, i.created_at,
                   jr.title, u.name as candidate_name, u.email as candidate_email
            FROM interviews i
            JOIN job_requirements jr ON i.requirement_id = jr.id
            JOIN users u ON i.candidate_id = u.id
            WHERE i.client_id = %s AND i.status = 'pending_client'
            ORDER BY i.created_at DESC
        """, (client_id,))
        
        interviews = cursor.fetchall()
        cursor.close()
        conn.close()
        
        result = []
        for interview in interviews:
            result.append({
                'id': interview[0],
                'requirement_id': interview[1],
                'candidate_id': interview[2],
                'status': interview[3],
                'created_at': interview[4].isoformat() if interview[4] else None,
                'job_title': interview[5],
                'candidate_name': interview[6],
                'candidate_email': interview[7]
            })
            
        return jsonify({'interviews': result})
        
    except Exception as e:
        app.logger.exception('Failed to get pending interviews')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

def generate_meeting_url():
    """Generate a unique meeting URL for the interview"""
    meeting_id = str(uuid.uuid4())[:8]  # Short unique ID
    # You can customize this to use different meeting platforms
    return f"https://meet.google.com/{meeting_id}"

@app.route('/client/set-interview-time', methods=['POST'])
def set_interview_time():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        data = request.get_json()
        interview_id = data.get('interview_id')
        interview_date = data.get('interview_date')
        interview_time = data.get('interview_time')
        
        if not all([interview_id, interview_date, interview_time]):
            return jsonify({'message': 'Interview ID, date, and time are required'}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Generate unique meeting URL
        meeting_url = generate_meeting_url()
        
        cursor.execute(
            'UPDATE interviews SET interview_date = %s, interview_time = %s, meeting_url = %s, status = %s WHERE id = %s AND client_id = %s',
            (interview_date, interview_time, meeting_url, 'scheduled', interview_id, payload['user_id'])
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Interview time set successfully', 'meeting_url': meeting_url})
        
    except Exception as e:
        app.logger.exception('Failed to set interview time')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/interviews/my-interviews', methods=['GET'])
def get_my_interviews():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        user_id = payload['user_id']
        role = payload['role']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if role == 'HR':
            cursor.execute("""
                SELECT i.id, i.interview_date, i.interview_time, i.meeting_url, i.status, i.created_at,
                       jr.title, u.name as candidate_name, u.email as candidate_email,
                       c.name as client_name
                FROM interviews i
                JOIN job_requirements jr ON i.requirement_id = jr.id
                JOIN users u ON i.candidate_id = u.id
                JOIN users c ON i.client_id = c.id
                WHERE i.hr_id = %s
                ORDER BY i.created_at DESC
            """, (user_id,))
        elif role == 'CANDIDATE':
            cursor.execute("""
                SELECT i.id, i.interview_date, i.interview_time, i.meeting_url, i.status, i.created_at,
                       jr.title, c.name as client_name, c.email as client_email,
                       h.name as hr_name, ir.decision, ir.feedback, 
                       CASE WHEN bgv.id IS NOT NULL OR bps.id IS NOT NULL THEN 1 ELSE 0 END as popup_handled,
                       CASE WHEN bgv.id IS NOT NULL THEN 1 ELSE 0 END as bgv_completed,
                       CASE WHEN vc.id IS NOT NULL THEN 1 ELSE 0 END as vendor_completed
                FROM interviews i
                JOIN job_requirements jr ON i.requirement_id = jr.id
                JOIN users c ON i.client_id = c.id
                JOIN users h ON i.hr_id = h.id
                LEFT JOIN interview_results ir ON i.id = ir.interview_id
                LEFT JOIN bgv_forms bgv ON i.id = bgv.interview_id AND i.candidate_id = bgv.candidate_id
                LEFT JOIN bgv_popup_shown bps ON i.id = bps.interview_id AND i.candidate_id = bps.candidate_id
                LEFT JOIN vendor_checklists vc ON i.id = vc.interview_id AND i.candidate_id = vc.candidate_id
                WHERE i.candidate_id = %s
                ORDER BY i.created_at DESC
            """, (user_id,))
        else:
            return jsonify({'interviews': []})
            
        interviews = cursor.fetchall()
        cursor.close()
        conn.close()
        
        result = []
        for interview in interviews:
            interview_data = {
                'id': interview[0],
                'interview_date': interview[1].isoformat() if interview[1] else None,
                'interview_time': str(interview[2]) if interview[2] else None,
                'meeting_url': interview[3],
                'status': interview[4],
                'created_at': interview[5].isoformat() if interview[5] else None,
                'job_title': interview[6],
                'other_party_name': interview[7],
                'other_party_email': interview[8],
                'third_party_name': interview[9] if len(interview) > 9 else None
            }
            
            if role == 'CANDIDATE' and len(interview) > 10:
                interview_data['decision'] = interview[10]
                interview_data['feedback'] = interview[11]
                interview_data['popup_handled'] = bool(interview[12])
                interview_data['bgv_completed'] = bool(interview[13])
                interview_data['vendor_completed'] = bool(interview[14])
            
            result.append(interview_data)
            
        return jsonify({'interviews': result})
        
    except Exception as e:
        app.logger.exception('Failed to get interviews')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/client/scheduled-interviews', methods=['GET'])
def get_scheduled_interviews():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        client_id = payload['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT i.id, i.interview_date, i.interview_time, i.meeting_url, i.status,
                   jr.title, u.name as candidate_name, u.email as candidate_email
            FROM interviews i
            JOIN job_requirements jr ON i.requirement_id = jr.id
            JOIN users u ON i.candidate_id = u.id
            WHERE i.client_id = %s AND i.status = 'scheduled'
            ORDER BY i.interview_date ASC, i.interview_time ASC
        """, (client_id,))
        
        interviews = cursor.fetchall()
        cursor.close()
        conn.close()
        
        result = []
        for interview in interviews:
            result.append({
                'id': interview[0],
                'interview_date': interview[1].isoformat() if interview[1] else None,
                'interview_time': str(interview[2]) if interview[2] else None,
                'meeting_url': interview[3],
                'status': interview[4],
                'job_title': interview[5],
                'candidate_name': interview[6],
                'candidate_email': interview[7]
            })
            
        return jsonify({'interviews': result})
        
    except Exception as e:
        app.logger.exception('Failed to get scheduled interviews')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/client/completed-interviews', methods=['GET'])
def get_completed_interviews():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        client_id = payload['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT i.id, i.interview_date, i.interview_time, i.status,
                   jr.title, u.name as candidate_name, u.email as candidate_email,
                   ir.decision, ir.feedback, ir.created_at as decision_date,
                   oc.confirmation as onboarding_status
            FROM interviews i
            JOIN job_requirements jr ON i.requirement_id = jr.id
            JOIN users u ON i.candidate_id = u.id
            JOIN interview_results ir ON i.id = ir.interview_id
            LEFT JOIN onboarding_confirmations oc ON i.id = oc.interview_id AND i.candidate_id = oc.candidate_id
            WHERE i.client_id = %s AND i.status = 'completed'
            ORDER BY ir.created_at DESC
        """, (client_id,))
        
        interviews = cursor.fetchall()
        cursor.close()
        conn.close()
        
        result = []
        for interview in interviews:
            result.append({
                'id': interview[0],
                'interview_date': interview[1].isoformat() if interview[1] else None,
                'interview_time': str(interview[2]) if interview[2] else None,
                'status': interview[3],
                'job_title': interview[4],
                'candidate_name': interview[5],
                'candidate_email': interview[6],
                'decision': interview[7],
                'feedback': interview[8],
                'decision_date': interview[9].isoformat() if interview[9] else None,
                'onboarding_status': interview[10]
            })
            
        return jsonify({'interviews': result})
        
    except Exception as e:
        app.logger.exception('Failed to get completed interviews')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/client/complete-interview', methods=['POST'])
def complete_interview():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        data = request.get_json()
        interview_id = data.get('interview_id')
        decision = data.get('decision')  # 'accepted' or 'rejected'
        feedback = data.get('feedback', '')
        
        if not interview_id or decision not in ['accepted', 'rejected']:
            return jsonify({'message': 'Interview ID and valid decision (accepted/rejected) are required'}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update interview status
        cursor.execute(
            'UPDATE interviews SET status = %s WHERE id = %s AND client_id = %s',
            ('completed', interview_id, payload['user_id'])
        )
        
        # Insert interview result
        cursor.execute(
            'INSERT INTO interview_results (interview_id, decision, feedback) VALUES (%s, %s, %s)',
            (interview_id, decision, feedback)
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Interview completed successfully'})
        
    except Exception as e:
        app.logger.exception('Failed to complete interview')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/candidate/bgv', methods=['GET', 'POST'])
def candidate_bgv():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        candidate_id = payload['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if request.method == 'GET':
            # Get BGV form if exists
            cursor.execute(
                'SELECT education, criminal_background, status FROM bgv_forms WHERE candidate_id = %s',
                (candidate_id,)
            )
            bgv = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if bgv:
                return jsonify({
                    'education': bgv[0],
                    'criminal_background': bgv[1],
                    'status': bgv[2]
                })
            else:
                return jsonify({'status': 'not_found'})
                
        elif request.method == 'POST':
            data = request.get_json()
            education = data.get('education', '').strip()
            criminal_background = data.get('criminal_background')
            interview_id = data.get('interview_id')
            
            if not all([education, criminal_background, interview_id]):
                return jsonify({'message': 'All fields are required'}), 400
                
            # Check if BGV form already exists
            cursor.execute(
                'SELECT id FROM bgv_forms WHERE candidate_id = %s AND interview_id = %s',
                (candidate_id, interview_id)
            )
            existing = cursor.fetchone()
            
            if existing:
                # Update existing BGV form
                cursor.execute(
                    'UPDATE bgv_forms SET education = %s, criminal_background = %s, status = %s WHERE candidate_id = %s AND interview_id = %s',
                    (education, criminal_background, 'submitted', candidate_id, interview_id)
                )
            else:
                # Insert new BGV form
                cursor.execute(
                    'INSERT INTO bgv_forms (candidate_id, interview_id, education, criminal_background, status) VALUES (%s, %s, %s, %s, %s)',
                    (candidate_id, interview_id, education, criminal_background, 'submitted')
                )
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'message': 'BGV form submitted successfully'})
            
    except Exception as e:
        app.logger.exception('BGV operation failed')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/candidate/vendor-checklist', methods=['GET', 'POST'])
def vendor_checklist():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        candidate_id = payload['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if request.method == 'GET':
            cursor.execute(
                'SELECT legal_documents, onboarding_training, security_policies, sla_kpi_defined, status FROM vendor_checklists WHERE candidate_id = %s',
                (candidate_id,)
            )
            checklist = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if checklist:
                return jsonify({
                    'legal_documents': checklist[0],
                    'onboarding_training': checklist[1],
                    'security_policies': checklist[2],
                    'sla_kpi_defined': checklist[3],
                    'status': checklist[4]
                })
            else:
                return jsonify({'status': 'not_found'})
                
        elif request.method == 'POST':
            data = request.get_json()
            legal_documents = data.get('legal_documents')
            onboarding_training = data.get('onboarding_training')
            security_policies = data.get('security_policies')
            sla_kpi_defined = data.get('sla_kpi_defined')
            interview_id = data.get('interview_id')
            
            if not all([legal_documents, onboarding_training, security_policies, sla_kpi_defined, interview_id]):
                return jsonify({'message': 'All fields are required'}), 400
                
            cursor.execute(
                'SELECT id FROM vendor_checklists WHERE candidate_id = %s AND interview_id = %s',
                (candidate_id, interview_id)
            )
            existing = cursor.fetchone()
            
            if existing:
                cursor.execute(
                    'UPDATE vendor_checklists SET legal_documents = %s, onboarding_training = %s, security_policies = %s, sla_kpi_defined = %s, status = %s WHERE candidate_id = %s AND interview_id = %s',
                    (legal_documents, onboarding_training, security_policies, sla_kpi_defined, 'completed', candidate_id, interview_id)
                )
            else:
                cursor.execute(
                    'INSERT INTO vendor_checklists (candidate_id, interview_id, legal_documents, onboarding_training, security_policies, sla_kpi_defined, status) VALUES (%s, %s, %s, %s, %s, %s, %s)',
                    (candidate_id, interview_id, legal_documents, onboarding_training, security_policies, sla_kpi_defined, 'completed')
                )
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'message': 'Vendor checklist completed successfully'})
            
    except Exception as e:
        app.logger.exception('Vendor checklist operation failed')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/candidate/bgv-popup-shown', methods=['POST'])
def mark_bgv_popup_shown():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        data = request.get_json()
        candidate_id = payload['user_id']
        interview_id = data.get('interview_id')
        
        if not interview_id:
            return jsonify({'message': 'Interview ID is required'}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'INSERT IGNORE INTO bgv_popup_shown (candidate_id, interview_id) VALUES (%s, %s)',
            (candidate_id, interview_id)
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Popup shown status recorded'})
        
    except Exception as e:
        app.logger.exception('Failed to mark popup shown')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/client/onboarding-candidates', methods=['GET'])
def get_onboarding_candidates():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        client_id = payload['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT i.id, i.candidate_id, u.name as candidate_name, jr.title,
                   jr.required_skills, bgv.education, bgv.criminal_background,
                   vc.legal_documents, vc.onboarding_training, vc.security_policies, vc.sla_kpi_defined
            FROM interviews i
            JOIN job_requirements jr ON i.requirement_id = jr.id
            JOIN users u ON i.candidate_id = u.id
            JOIN interview_results ir ON i.id = ir.interview_id
            JOIN bgv_forms bgv ON i.id = bgv.interview_id AND i.candidate_id = bgv.candidate_id
            JOIN vendor_checklists vc ON i.id = vc.interview_id AND i.candidate_id = vc.candidate_id
            LEFT JOIN onboarding_confirmations oc ON i.id = oc.interview_id AND i.candidate_id = oc.candidate_id
            WHERE i.client_id = %s AND ir.decision = 'accepted' AND oc.id IS NULL
            ORDER BY i.created_at DESC
        """, (client_id,))
        
        candidates = cursor.fetchall()
        cursor.close()
        conn.close()
        
        result = []
        for candidate in candidates:
            result.append({
                'interview_id': candidate[0],
                'candidate_id': candidate[1],
                'candidate_name': candidate[2],
                'job_title': candidate[3],
                'required_skills': json.loads(candidate[4]) if candidate[4] else [],
                'education': candidate[5],
                'criminal_background': candidate[6],
                'legal_documents': candidate[7],
                'onboarding_training': candidate[8],
                'security_policies': candidate[9],
                'sla_kpi_defined': candidate[10]
            })
            
        return jsonify({'candidates': result})
        
    except Exception as e:
        app.logger.exception('Failed to get onboarding candidates')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/client/confirm-onboarding', methods=['POST'])
def confirm_onboarding():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        data = request.get_json()
        interview_id = data.get('interview_id')
        candidate_id = data.get('candidate_id')
        confirmation = data.get('confirmation')  # 'yes' or 'no'
        
        if not all([interview_id, candidate_id, confirmation]) or confirmation not in ['yes', 'no']:
            return jsonify({'message': 'Interview ID, candidate ID, and valid confirmation are required'}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'INSERT INTO onboarding_confirmations (candidate_id, interview_id, client_id, confirmation) VALUES (%s, %s, %s, %s)',
            (candidate_id, interview_id, payload['user_id'], confirmation)
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': f'Onboarding {confirmation} recorded successfully'})
        
    except Exception as e:
        app.logger.exception('Failed to confirm onboarding')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/hr/onboarded-candidates', methods=['GET'])
def get_onboarded_candidates():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT i.id, i.candidate_id, u.name as candidate_name, jr.title,
                   oc.confirmation, oc.created_at as onboarded_at,
                   ap.assets_provided, ap.asset_details, ap.provided_at
            FROM interviews i
            JOIN job_requirements jr ON i.requirement_id = jr.id
            JOIN users u ON i.candidate_id = u.id
            JOIN onboarding_confirmations oc ON i.id = oc.interview_id AND i.candidate_id = oc.candidate_id
            LEFT JOIN asset_provisions ap ON i.id = ap.interview_id AND i.candidate_id = ap.candidate_id
            WHERE oc.confirmation = 'yes'
            ORDER BY oc.created_at DESC
        """)
        
        candidates = cursor.fetchall()
        cursor.close()
        conn.close()
        
        result = []
        for candidate in candidates:
            result.append({
                'interview_id': candidate[0],
                'candidate_id': candidate[1],
                'candidate_name': candidate[2],
                'job_title': candidate[3],
                'onboarded_at': candidate[5].isoformat() if candidate[5] else None,
                'assets_provided': candidate[6] == 'yes' if candidate[6] else False,
                'asset_details': candidate[7],
                'assets_provided_at': candidate[8].isoformat() if candidate[8] else None
            })
            
        return jsonify({'candidates': result})
        
    except Exception as e:
        app.logger.exception('Failed to get onboarded candidates')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/hr/provide-assets', methods=['POST'])
def provide_assets():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        data = request.get_json()
        interview_id = data.get('interview_id')
        candidate_id = data.get('candidate_id')
        asset_details = data.get('asset_details', '').strip()
        
        if not all([interview_id, candidate_id]):
            return jsonify({'message': 'Interview ID and candidate ID are required'}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if asset provision record exists
        cursor.execute(
            'SELECT id FROM asset_provisions WHERE candidate_id = %s AND interview_id = %s',
            (candidate_id, interview_id)
        )
        existing = cursor.fetchone()
        
        if existing:
            # Update existing record
            cursor.execute(
                'UPDATE asset_provisions SET assets_provided = %s, asset_details = %s, provided_at = %s WHERE candidate_id = %s AND interview_id = %s',
                ('yes', asset_details, datetime.now(), candidate_id, interview_id)
            )
        else:
            # Insert new record
            cursor.execute(
                'INSERT INTO asset_provisions (candidate_id, interview_id, hr_id, assets_provided, asset_details, provided_at) VALUES (%s, %s, %s, %s, %s, %s)',
                (candidate_id, interview_id, payload['user_id'], 'yes', asset_details, datetime.now())
            )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Assets provided successfully'})
        
    except Exception as e:
        app.logger.exception('Failed to provide assets')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/client/hiring-reports', methods=['GET'])
def get_hiring_reports():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        client_id = payload['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get hiring statistics and selected candidates
        cursor.execute("""
            SELECT 
                jr.title as job_title,
                jr.required_skills,
                COUNT(DISTINCT i.id) as total_interviews,
                COUNT(DISTINCT CASE WHEN ir.decision = 'accepted' THEN i.id END) as accepted_count,
                COUNT(DISTINCT CASE WHEN ir.decision = 'rejected' THEN i.id END) as rejected_count,
                COUNT(DISTINCT CASE WHEN oc.confirmation = 'yes' THEN i.id END) as onboarded_count,
                GROUP_CONCAT(
                    CASE WHEN ir.decision = 'accepted' THEN 
                        CONCAT(u.name, '|', ir.created_at, '|', COALESCE(oc.confirmation, 'pending'))
                    END SEPARATOR ';;'
                ) as selected_candidates
            FROM job_requirements jr
            LEFT JOIN interviews i ON jr.id = i.requirement_id
            LEFT JOIN interview_results ir ON i.id = ir.interview_id
            LEFT JOIN users u ON i.candidate_id = u.id
            LEFT JOIN onboarding_confirmations oc ON i.id = oc.interview_id AND i.candidate_id = oc.candidate_id
            WHERE jr.client_id = %s
            GROUP BY jr.id, jr.title, jr.required_skills
            ORDER BY jr.created_at DESC
        """, (client_id,))
        
        reports = cursor.fetchall()
        cursor.close()
        conn.close()
        
        result = []
        for report in reports:
            selected_candidates = []
            if report[6]:  # selected_candidates string
                candidates_data = report[6].split(';;')
                for candidate_data in candidates_data:
                    if candidate_data.strip():
                        parts = candidate_data.split('|')
                        if len(parts) >= 3:
                            selected_candidates.append({
                                'name': parts[0],
                                'selected_date': parts[1],
                                'onboarding_status': parts[2]
                            })
            
            result.append({
                'job_title': report[0],
                'required_skills': json.loads(report[1]) if report[1] else [],
                'total_interviews': report[2] or 0,
                'accepted_count': report[3] or 0,
                'rejected_count': report[4] or 0,
                'onboarded_count': report[5] or 0,
                'selected_candidates': selected_candidates
            })
            
        return jsonify({'reports': result})
        
    except Exception as e:
        app.logger.exception('Failed to get hiring reports')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/hr/dashboard-stats', methods=['GET'])
def get_hr_dashboard_stats():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get total candidates
        cursor.execute('SELECT COUNT(*) FROM users WHERE role = "CANDIDATE"')
        total_candidates = cursor.fetchone()[0]
        
        # Get active job postings
        cursor.execute('SELECT COUNT(*) FROM job_requirements WHERE status = "active"')
        active_jobs = cursor.fetchone()[0]
        
        # Get pending interviews (waiting for client time setting)
        cursor.execute('SELECT COUNT(*) FROM interviews WHERE status = "pending_client"')
        pending_interviews = cursor.fetchone()[0]
        
        # Get applications this week
        cursor.execute('SELECT COUNT(*) FROM interviews WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)')
        applications_week = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'total_candidates': total_candidates,
            'active_jobs': active_jobs,
            'pending_interviews': pending_interviews,
            'applications_week': applications_week
        })
        
    except Exception as e:
        app.logger.exception('Failed to get HR dashboard stats')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/client/dashboard-stats', methods=['GET'])
def get_client_dashboard_stats():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        client_id = payload['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get active requirements
        cursor.execute('SELECT COUNT(*) FROM job_requirements WHERE client_id = %s AND status = "active"', (client_id,))
        active_requirements = cursor.fetchone()[0]
        
        # Get shortlisted candidates (interviews scheduled)
        cursor.execute('SELECT COUNT(*) FROM interviews WHERE client_id = %s', (client_id,))
        shortlisted_candidates = cursor.fetchone()[0]
        
        # Get interviews scheduled
        cursor.execute('SELECT COUNT(*) FROM interviews WHERE client_id = %s AND status IN ("scheduled", "pending_client")', (client_id,))
        interviews_scheduled = cursor.fetchone()[0]
        
        # Get positions filled (onboarded)
        cursor.execute('SELECT COUNT(*) FROM onboarding_confirmations WHERE client_id = %s AND confirmation = "yes"', (client_id,))
        positions_filled = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'active_requirements': active_requirements,
            'shortlisted_candidates': shortlisted_candidates,
            'interviews_scheduled': interviews_scheduled,
            'positions_filled': positions_filled
        })
        
    except Exception as e:
        app.logger.exception('Failed to get client dashboard stats')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/hr/analytics', methods=['GET'])
def get_hr_analytics():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
        
        # Get optional date range parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        time_range = request.args.get('range', '30d')  # Default to 30 days
        
        # Calculate date range
        if start_date and end_date:
            # Custom date range
            date_filter = f"created_at >= '{start_date}' AND created_at <= '{end_date} 23:59:59'"
            interval_days = (datetime.strptime(end_date, '%Y-%m-%d') - datetime.strptime(start_date, '%Y-%m-%d')).days
        elif time_range == '7d':
            date_filter = "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
            interval_days = 7
        elif time_range == '90d':
            date_filter = "created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)"
            interval_days = 90
        else:  # Default 30d
            date_filter = "created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
            interval_days = 30
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Applicants Over Time (with custom date range support)
        cursor.execute(f"""
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM users
            WHERE role = 'CANDIDATE' AND {date_filter}
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        """)
        applicants_over_time = [{'date': str(row[0]), 'count': row[1]} for row in cursor.fetchall()]
        
        # 2. Interview Outcomes
        cursor.execute("""
            SELECT 
                SUM(CASE WHEN ir.decision = 'accepted' THEN 1 ELSE 0 END) as accepted,
                SUM(CASE WHEN ir.decision = 'rejected' THEN 1 ELSE 0 END) as rejected,
                COUNT(DISTINCT i.id) - COUNT(ir.id) as pending
            FROM interviews i
            LEFT JOIN interview_results ir ON i.id = ir.interview_id
        """)
        outcomes = cursor.fetchone()
        interview_outcomes = {
            'accepted': outcomes[0] or 0,
            'rejected': outcomes[1] or 0,
            'pending': outcomes[2] or 0
        }
        
        # 3. Service Line Breakdown (by job title)
        cursor.execute("""
            SELECT jr.title, COUNT(DISTINCT i.id) as interview_count
            FROM job_requirements jr
            LEFT JOIN interviews i ON jr.id = i.requirement_id
            GROUP BY jr.id, jr.title
            ORDER BY interview_count DESC
            LIMIT 10
        """)
        service_line_breakdown = [{'title': row[0], 'count': row[1]} for row in cursor.fetchall()]
        
        # 4. Hiring Funnel
        cursor.execute('SELECT COUNT(*) FROM users WHERE role = "CANDIDATE"')
        total_applications = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(DISTINCT i.candidate_id)
            FROM interviews i
        """)
        shortlisted = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(DISTINCT i.id)
            FROM interviews i
            WHERE i.status = 'scheduled'
        """)
        scheduled = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(DISTINCT i.id)
            FROM interviews i
            WHERE i.status = 'completed'
        """)
        interviewed = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(DISTINCT i.id)
            FROM interviews i
            JOIN interview_results ir ON i.id = ir.interview_id
            WHERE ir.decision = 'accepted'
        """)
        selected = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(DISTINCT oc.candidate_id)
            FROM onboarding_confirmations oc
            WHERE oc.confirmation = 'yes'
        """)
        onboarded = cursor.fetchone()[0]
        
        hiring_funnel = {
            'applications': total_applications,
            'shortlisted': shortlisted,
            'scheduled': scheduled,
            'interviewed': interviewed,
            'selected': selected,
            'onboarded': onboarded
        }
        
        # 5. Top Skills (most requested)
        cursor.execute("""
            SELECT required_skills
            FROM job_requirements
            WHERE required_skills IS NOT NULL AND required_skills != ''
        """)
        all_skills = {}
        for row in cursor.fetchall():
            try:
                skills_list = json.loads(row[0]) if row[0] else []
                for skill in skills_list:
                    if skill:
                        all_skills[skill] = all_skills.get(skill, 0) + 1
            except:
                continue
        
        top_skills = sorted(all_skills.items(), key=lambda x: x[1], reverse=True)[:10]
        top_skills_data = [{'skill': skill, 'count': count} for skill, count in top_skills]
        
        # 6. Overview Metrics (with dynamic date range)
        if start_date and end_date:
            # For custom range, compare with previous period of same length
            cursor.execute(f"""
                SELECT 
                    (SELECT COUNT(*) FROM interviews WHERE {date_filter}) as applications_current,
                    (SELECT COUNT(*) FROM interviews WHERE 
                     created_at >= DATE_SUB('{start_date}', INTERVAL {interval_days} DAY) 
                     AND created_at < '{start_date}') as applications_previous
            """)
        else:
            cursor.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM interviews WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as applications_week,
                    (SELECT COUNT(*) FROM interviews WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)) as applications_last_week
            """)
        
        apps_data = cursor.fetchone()
        applications_this_week = apps_data[0] or 0
        applications_last_week = apps_data[1] or 0
        applications_change = ((applications_this_week - applications_last_week) / applications_last_week * 100) if applications_last_week > 0 else 0
        
        # Success rate
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN ir.decision = 'accepted' THEN 1 ELSE 0 END) as accepted
            FROM interview_results ir
        """)
        success_data = cursor.fetchone()
        total_interviews = success_data[0] or 0
        accepted_count = success_data[1] or 0
        success_rate = (accepted_count / total_interviews * 100) if total_interviews > 0 else 0
        
        # Average time to hire
        cursor.execute("""
            SELECT AVG(DATEDIFF(oc.created_at, i.created_at)) as avg_days
            FROM interviews i
            JOIN onboarding_confirmations oc ON i.id = oc.interview_id
            WHERE oc.confirmation = 'yes'
        """)
        avg_time = cursor.fetchone()[0]
        avg_time_to_hire = round(avg_time) if avg_time else 0
        
        overview_metrics = {
            'applications_this_week': applications_this_week,
            'applications_change': round(applications_change, 1),
            'success_rate': round(success_rate, 1),
            'avg_time_to_hire': avg_time_to_hire,
            'active_positions': len(service_line_breakdown)
        }
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'applicants_over_time': applicants_over_time,
            'interview_outcomes': interview_outcomes,
            'service_line_breakdown': service_line_breakdown,
            'hiring_funnel': hiring_funnel,
            'top_skills': top_skills_data,
            'overview_metrics': overview_metrics
        })
        
    except Exception as e:
        app.logger.exception('Failed to get HR analytics')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/candidate/analytics', methods=['GET'])
def get_candidate_analytics():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        candidate_id = payload['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Personal Journey Timeline
        cursor.execute("""
            SELECT 
                u.created_at as application_date,
                MIN(i.created_at) as first_interview_scheduled,
                MIN(CASE WHEN i.status = 'completed' THEN i.created_at END) as interview_completed,
                MIN(ir.created_at) as decision_date,
                ir.decision,
                MIN(bgv.created_at) as bgv_completed,
                MIN(vc.created_at) as vendor_completed,
                MIN(oc.created_at) as onboarding_date
            FROM users u
            LEFT JOIN interviews i ON u.id = i.candidate_id
            LEFT JOIN interview_results ir ON i.id = ir.interview_id
            LEFT JOIN bgv_forms bgv ON i.id = bgv.interview_id AND u.id = bgv.candidate_id
            LEFT JOIN vendor_checklists vc ON i.id = vc.interview_id AND u.id = vc.candidate_id
            LEFT JOIN onboarding_confirmations oc ON i.id = oc.interview_id AND u.id = oc.candidate_id
            WHERE u.id = %s
            GROUP BY u.id, ir.decision
        """, (candidate_id,))
        
        timeline_data = cursor.fetchone()
        journey_timeline = {
            'application_date': timeline_data[0].isoformat() if timeline_data and timeline_data[0] else None,
            'first_interview_scheduled': timeline_data[1].isoformat() if timeline_data and timeline_data[1] else None,
            'interview_completed': timeline_data[2].isoformat() if timeline_data and timeline_data[2] else None,
            'decision_date': timeline_data[3].isoformat() if timeline_data and timeline_data[3] else None,
            'decision': timeline_data[4] if timeline_data and timeline_data[4] else None,
            'bgv_completed': timeline_data[5].isoformat() if timeline_data and timeline_data[5] else None,
            'vendor_completed': timeline_data[6].isoformat() if timeline_data and timeline_data[6] else None,
            'onboarding_date': timeline_data[7].isoformat() if timeline_data and timeline_data[7] else None
        }
        
        # 2. Application Status Breakdown
        cursor.execute("""
            SELECT 
                COUNT(CASE WHEN i.status IN ('pending_client', 'scheduled') THEN 1 END) as pending,
                COUNT(CASE WHEN i.status = 'completed' AND ir.decision = 'accepted' THEN 1 END) as offers,
                COUNT(CASE WHEN i.status = 'completed' AND ir.decision = 'rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as completed
            FROM interviews i
            LEFT JOIN interview_results ir ON i.id = ir.interview_id
            WHERE i.candidate_id = %s
        """, (candidate_id,))
        
        status_data = cursor.fetchone()
        application_status = {
            'pending': status_data[0] or 0,
            'offers': status_data[1] or 0,
            'rejected': status_data[2] or 0,
            'completed': status_data[3] or 0
        }
        
        # 3. Interview Performance
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT i.id) as total_interviews,
                COUNT(CASE WHEN ir.decision = 'accepted' THEN 1 END) as accepted
            FROM interviews i
            LEFT JOIN interview_results ir ON i.id = ir.interview_id
            WHERE i.candidate_id = %s AND i.status = 'completed'
        """, (candidate_id,))
        
        perf_data = cursor.fetchone()
        total_completed = perf_data[0] or 0
        total_accepted = perf_data[1] or 0
        success_rate = (total_accepted / total_completed * 100) if total_completed > 0 else 0
        
        interview_performance = {
            'total_interviews': total_completed,
            'success_rate': round(success_rate, 1)
        }
        
        # 4. Skill Match Analysis (get candidate skills and compare with job requirements)
        cursor.execute("""
            SELECT cp.resume_path
            FROM candidate_profiles cp
            WHERE cp.user_id = %s
        """, (candidate_id,))
        
        profile = cursor.fetchone()
        candidate_skills = []
        
        if profile and profile[0]:
            try:
                with open(profile[0], 'rb') as f:
                    content = f.read()
                
                text = ""
                filename = profile[0].lower()
                if filename.endswith(".pdf") or (content and content[:4] == b"%PDF"):
                    text = _extract_text_from_pdf_bytes(content)
                elif filename.endswith(".docx") or filename.endswith(".doc"):
                    text = _extract_text_from_docx_bytes(content)
                
                if text:
                    candidate_skills = _call_gen_ai_for_skills(text)
            except:
                pass
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'journey_timeline': journey_timeline,
            'application_status': application_status,
            'interview_performance': interview_performance,
            'candidate_skills': candidate_skills
        })
        
    except Exception as e:
        app.logger.exception('Failed to get candidate analytics')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/hr/interview-tracking', methods=['GET'])
def get_hr_interview_tracking():
    try:
        payload = verify_token()
        if not payload:
            return jsonify({'message': 'Unauthorized'}), 401
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get comprehensive interview tracking data
        cursor.execute("""
            SELECT 
                i.id, i.status, i.interview_date, i.interview_time, i.created_at,
                jr.title as job_title,
                u_candidate.name as candidate_name, u_candidate.email as candidate_email,
                u_client.name as client_name, u_client.email as client_email,
                ir.decision, ir.feedback, ir.created_at as decision_date,
                bgv.id as bgv_completed, bgv.education, bgv.criminal_background,
                vc.id as vendor_completed, vc.legal_documents, vc.onboarding_training, 
                vc.security_policies, vc.sla_kpi_defined,
                oc.confirmation as onboarding_status, oc.created_at as onboarding_date,
                ap.assets_provided, ap.asset_details, ap.provided_at as assets_date
            FROM interviews i
            JOIN job_requirements jr ON i.requirement_id = jr.id
            JOIN users u_candidate ON i.candidate_id = u_candidate.id
            JOIN users u_client ON i.client_id = u_client.id
            LEFT JOIN interview_results ir ON i.id = ir.interview_id
            LEFT JOIN bgv_forms bgv ON i.id = bgv.interview_id AND i.candidate_id = bgv.candidate_id
            LEFT JOIN vendor_checklists vc ON i.id = vc.interview_id AND i.candidate_id = vc.candidate_id
            LEFT JOIN onboarding_confirmations oc ON i.id = oc.interview_id AND i.candidate_id = oc.candidate_id
            LEFT JOIN asset_provisions ap ON i.id = ap.interview_id AND i.candidate_id = ap.candidate_id
            ORDER BY i.created_at DESC
        """)
        
        interviews = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Categorize interviews
        pending_client = []
        scheduled = []
        completed_accepted = []
        completed_rejected = []
        bgv_pending = []
        vendor_pending = []
        onboarding_pending = []
        fully_onboarded = []
        
        for interview in interviews:
            interview_data = {
                'id': interview[0],
                'status': interview[1],
                'interview_date': interview[2].isoformat() if interview[2] else None,
                'interview_time': str(interview[3]) if interview[3] else None,
                'created_at': interview[4].isoformat() if interview[4] else None,
                'job_title': interview[5],
                'candidate_name': interview[6],
                'candidate_email': interview[7],
                'client_name': interview[8],
                'client_email': interview[9],
                'decision': interview[10],
                'feedback': interview[11],
                'decision_date': interview[12].isoformat() if interview[12] else None,
                'bgv_completed': bool(interview[13]),
                'bgv_education': interview[14],
                'bgv_criminal_background': interview[15],
                'vendor_completed': bool(interview[16]),
                'vendor_legal_documents': interview[17],
                'vendor_onboarding_training': interview[18],
                'vendor_security_policies': interview[19],
                'vendor_sla_kpi_defined': interview[20],
                'onboarding_status': interview[21],
                'onboarding_date': interview[22].isoformat() if interview[22] else None,
                'assets_provided': interview[23] == 'yes' if interview[23] else False,
                'asset_details': interview[24],
                'assets_date': interview[25].isoformat() if interview[25] else None
            }
            
            # Categorize based on status and completion
            if interview_data['status'] == 'pending_client':
                pending_client.append(interview_data)
            elif interview_data['status'] == 'scheduled':
                scheduled.append(interview_data)
            elif interview_data['status'] == 'completed':
                if interview_data['decision'] == 'accepted':
                    if interview_data['assets_provided']:
                        fully_onboarded.append(interview_data)
                    elif interview_data['onboarding_status'] == 'yes':
                        onboarding_pending.append(interview_data)
                    elif interview_data['vendor_completed']:
                        onboarding_pending.append(interview_data)
                    elif interview_data['bgv_completed']:
                        vendor_pending.append(interview_data)
                    else:
                        bgv_pending.append(interview_data)
                    completed_accepted.append(interview_data)
                else:
                    completed_rejected.append(interview_data)
        
        return jsonify({
            'pending_client': pending_client,
            'scheduled': scheduled,
            'completed_accepted': completed_accepted,
            'completed_rejected': completed_rejected,
            'bgv_pending': bgv_pending,
            'vendor_pending': vendor_pending,
            'onboarding_pending': onboarding_pending,
            'fully_onboarded': fully_onboarded
        })
        
    except Exception as e:
        app.logger.exception('Failed to get HR interview tracking')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/ai/provider', methods=['GET'])
def ai_provider():
    """
    Returns whether an AI provider key is configured and which model/provider to use.
    Frontend expects { has_key: bool, model: str, provider: str }.
    """
    try:
        openai_key = os.getenv("OPENAI_API_KEY")
        google_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GOOGLE_API_KEYS")
        has_key = bool(openai_key or google_key)
        if google_key:
            provider = "google"
            model = GOOGLE_MODEL
        elif openai_key:
            provider = "openai"
            model = os.getenv("OPENAI_MODEL") or None
        else:
            provider = None
            model = None
        return jsonify({"has_key": has_key, "model": model, "provider": provider})
    except Exception:
        app.logger.exception("ai_provider failed")
        return jsonify({"has_key": False, "model": None, "provider": None}), 500

# Database connection
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv('MYSQL_HOST', 'localhost'),
        user=os.getenv('MYSQL_USER', 'root'),
        password=os.getenv('MYSQL_PASSWORD', 'root'),
        database=os.getenv('MYSQL_DATABASE', 'onboarding')
    )

# Initialize database tables
def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
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
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization failed: {e}")

# Hash password
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Generate JWT token
def generate_token(user_id, email, role, name):
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'name': name,
        'exp': datetime.utcnow() + timedelta(minutes=int(os.getenv('JWT_EXPIRES_MIN', 60)))
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

@app.route('/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No data provided'}), 400
            
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        role = data.get('role', 'candidate')
        
        if not all([name, email, password]):
            return jsonify({'message': 'Name, email, and password are required'}), 400
            
        if len(password) < 6:
            return jsonify({'message': 'Password must be at least 6 characters'}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'message': 'Email already registered'}), 409
            
        # Create new user
        password_hash = hash_password(password)
        role_upper = role.upper()
        cursor.execute(
            'INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, %s, %s)',
            (name, email, password_hash, role_upper)
        )
        user_id = cursor.lastrowid
        
        # Create candidate profile if role is candidate
        if role_upper == 'CANDIDATE':
            cursor.execute(
                'INSERT INTO candidate_profiles (user_id, name, email) VALUES (%s, %s, %s)',
                (user_id, name, email)
            )
        # Create client profile if role is client
        elif role_upper == 'CLIENT':
            cursor.execute(
                'INSERT INTO clients (user_id, contact_person) VALUES (%s, %s)',
                (user_id, name)
            )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Generate token
        token = generate_token(user_id, email, role_upper, name)
        
        return jsonify({
            'message': 'Account created successfully',
            'token': token,
            'user': {'id': user_id, 'name': name, 'email': email, 'role': role}
        }), 201
        
    except Exception as e:
        app.logger.exception('Signup failed')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

@app.route('/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No data provided'}), 400
            
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not all([email, password]):
            return jsonify({'message': 'Email and password are required'}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user
        cursor.execute(
            'SELECT id, name, email, password_hash, role FROM users WHERE email = %s',
            (email,)
        )
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user or user[3] != hash_password(password):
            return jsonify({'message': 'Invalid email or password'}), 401
            
        # Generate token
        token = generate_token(user[0], user[2], user[4], user[1])
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {'id': user[0], 'name': user[1], 'email': user[2], 'role': user[4]}
        })
        
    except Exception as e:
        app.logger.exception('Login failed')
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

if __name__ == '__main__':
    # Initialize database on startup
    init_db()
    # Run directly for local development so routes are available
    app.run(host='127.0.0.1', port=4000, debug=True)