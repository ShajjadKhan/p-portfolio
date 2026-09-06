#!/bin/bash
pkill -f '/home/tserver/p-portfolio/venv/bin/python app.py' 2>/dev/null || true
echo "Shajjad Khan Portfolio daemon stopped"
