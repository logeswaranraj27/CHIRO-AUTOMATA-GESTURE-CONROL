@echo off
echo ========================================================
echo CHIRO-AUTOMATA: Launching Full-Stack Assistive Platform
echo ========================================================
start "" http://localhost:8000
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
pause

