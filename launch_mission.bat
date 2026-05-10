@echo off
title NAVA-TARAN MISSION CONTROL

echo [1/2] INITIALIZING BACKEND SERVER...
start cmd /k "cd backend-server && node server.js"

echo [2/2] STARTING REACT CLIENT...
start cmd /k "cd client && npm start"

echo SYSTEM OPERATIONAL.
pause