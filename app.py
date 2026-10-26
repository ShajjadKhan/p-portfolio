#!/usr/bin/env python3
"""
Shajjad Khan — Official Portfolio & FastTrack Tools Application
Domain: www.shajjadkhan.com
Port: 9191
"""

import os
import sys
import sqlite3
import datetime
import json
import re
from xml.sax.saxutils import escape
from flask import Flask, render_template, request, jsonify, redirect, Response

from tools_blueprint import tools_bp
from tools_catalog import TOOLS


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'contacts.db')
SITE_URL = 'https://www.shajjadkhan.com'
SITEMAP_LASTMOD = os.environ.get('SITEMAP_LASTMOD', '2026-10-26')

app = Flask(
    __name__,
    static_folder='static',
    template_folder='templates'
)
app.config['SECRET_KEY'] = os.environ.get('PORTFOLIO_SECRET_KEY', 'shajjadkhan_portfolio_secure_key_2026')
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max upload

# Register Modular Tools Platform at /tools
app.register_blueprint(tools_bp, url_prefix='/tools')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            company TEXT,
            project_type TEXT,
            message TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_read INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()

# Initialize DB on startup
init_db()

@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Server'] = 'ShajjadKhan-Platform/2.0'
    return response

@app.route('/')
def home():
    """Renders the official portfolio homepage for www.shajjadkhan.com (100% ad-free)."""
    return render_template(
        'index.html',
        year=datetime.datetime.now().year,
        tools_url='/tools'
    )

@app.route('/ads.txt')
def ads_txt():
    """Google AdSense root crawler authorization record."""
    pub_id = os.environ.get('ADSENSE_PUB_ID', 'ca-pub-7534827047793212').replace('ca-', '')
    lines = [
        f"google.com, {pub_id}, DIRECT, f08c47fec0942fa0",
        "# FastTrack Tools - AdSense Authorization Record",
        f"# Publisher: Shajjad Khan ({pub_id})"
    ]
    return Response('\n'.join(lines) + '\n', mimetype='text/plain')

@app.route('/health')
def health():
    """Health check endpoint for monitoring and reverse proxies."""
    return jsonify({
        "status": "healthy",
        "domain": "www.shajjadkhan.com",
        "server_time": datetime.datetime.utcnow().isoformat() + "Z",
        "port": 9191,
        "tools_suite": "50 utilities active",
        "tools_mounted_at": "/tools"
    })

@app.route('/api/contact', methods=['POST'])
def contact_submit():
    """Handles incoming client inquiries and stores in SQLite."""
    data = request.get_json() or request.form
    
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    company = (data.get('company') or '').strip()
    project_type = (data.get('project_type') or 'General Inquiry').strip()
    message = (data.get('message') or '').strip()
    
    # Validation
    if not name or not email or not message:
        return jsonify({
            "status": "error",
            "message": "Please fill in your Name, Email, and Message."
        }), 400
        
    email_regex = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if not re.match(email_regex, email):
        return jsonify({
            "status": "error",
            "message": "Please enter a valid email address."
        }), 400

    ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
    user_agent = request.headers.get('User-Agent', '')[:250]

    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO inquiries (name, email, company, project_type, message, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (name, email, company, project_type, message, ip_address, user_agent))
        conn.commit()
        conn.close()
        
        return jsonify({
            "status": "success",
            "message": f"Thank you, {name}! Your message has been received. Shajjad Khan will respond promptly."
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "Unable to save inquiry at this moment. Please try again or email directly."
        }), 500

@app.route('/robots.txt')
def robots():
    return (
        "User-agent: *\n"
        "Allow: /\n"
        f"Sitemap: {SITE_URL}/sitemap.xml\n"
    ), 200, {'Content-Type': 'text/plain'}

@app.route('/manifest.webmanifest')
def manifest():
    """Web app manifest for installable browser and mobile shortcuts."""
    data = {
        "name": "Shajjad Khan — Founder & Systems Architect",
        "short_name": "Shajjad Khan",
        "description": "Portfolio of Shajjad Khan, founder and systems architect behind TawreedFlow, plus 50+ private in-browser tools.",
        "id": "/",
        "start_url": "/",
        "scope": "/",
        "display": "standalone",
        "background_color": "#050811",
        "theme_color": "#050811",
        "lang": "en",
        "dir": "ltr",
        "categories": ["business", "productivity"],
        "icons": [
            {
                "src": "/static/images/icon-192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any"
            },
            {
                "src": "/static/images/icon-512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any"
            }
        ]
    }
    return Response(json.dumps(data), mimetype='application/manifest+json')

@app.route('/sitemap.xml')
def sitemap():
    """Sitemap covering the homepage, tools catalog, and every live tool page."""
    entries = []

    def add(loc, changefreq, priority):
        entries.append(
            f"  <url>\n"
            f"    <loc>{escape(loc)}</loc>\n"
            f"    <lastmod>{SITEMAP_LASTMOD}</lastmod>\n"
            f"    <changefreq>{changefreq}</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            f"  </url>"
        )

    add(f"{SITE_URL}/", "weekly", "1.0")
    add(f"{SITE_URL}/tools", "daily", "0.9")

    # Case study, about, and writing pages are homepage sections today.
    # Add their dedicated URLs here when P3-1/P3-2 ship.
    seen = set()
    for tool in TOOLS:
        slug = tool.get('slug')
        if not slug or slug in seen:
            continue
        seen.add(slug)
        add(f"{SITE_URL}/tools/{slug}", "monthly", "0.7")

    add(f"{SITE_URL}/tools/privacy", "yearly", "0.3")
    add(f"{SITE_URL}/tools/terms", "yearly", "0.3")

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>"
    )
    return Response(xml, mimetype='application/xml')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 9191))
    print(f"🚀 Shajjad Khan Portfolio & Tools server starting on 0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)

