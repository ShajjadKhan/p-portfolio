#!/usr/bin/env bash
set -euo pipefail

# Run on production as a user with sudo access after reviewing the release.
APP_DIR=/home/shajjad/p-portfolio
BACKUP_DIR=/home/shajjad/portfolio-static-backup-$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"
sudo cp -a /etc/nginx/sites-available/shajjadkhan "$BACKUP_DIR/nginx-shajjadkhan.conf"
sudo cp -a /var/www/shajjadkhan.html "$BACKUP_DIR/shajjadkhan.html"

cd "$APP_DIR"
git pull --ff-only origin main
./venv/bin/pip install --disable-pip-version-check -r requirements.txt

sudo install -m 0644 deploy/shajjadkhan-portfolio.service /etc/systemd/system/shajjadkhan-portfolio.service
sudo install -m 0644 deploy/nginx-shajjadkhan.conf /etc/nginx/sites-available/shajjadkhan
sudo systemctl daemon-reload
sudo systemctl enable --now shajjadkhan-portfolio.service
sudo nginx -t
sudo systemctl reload nginx
curl --fail --silent --show-error --max-time 15 http://127.0.0.1:9191/health
curl --fail --silent --show-error --max-time 15 https://shajjadkhan.com/health

echo "Portfolio deployed. Static rollback files: $BACKUP_DIR"
