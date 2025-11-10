@echo off
echo Installing Python dependencies...
pip install -r requirements.txt

echo Setting up database...
python setup_db.py

echo Starting Flask server...
python app.py

pause