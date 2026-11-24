@echo off
echo ========================================================
echo CHIRO-AUTOMATA: Launching Python FastAPI + Vision Engine
echo ========================================================
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
pause

