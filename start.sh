#!/bin/bash
cd /home/tserver/p-portfolio
# Kill previous portfolio daemon on port 9191 if running
pkill -f '/home/tserver/p-portfolio/venv/bin/python app.py' 2>/dev/null || true
sleep 1
PORT=9191 nohup /home/tserver/p-portfolio/venv/bin/python app.py >> /home/tserver/p-portfolio/server.log 2>&1 &
sleep 1
echo "Shajjad Khan Portfolio daemon launched on 0.0.0.0:9191"
