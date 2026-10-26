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
from email.utils import format_datetime
from xml.sax.saxutils import escape
from flask import Flask, render_template, request, jsonify, redirect, Response, abort

from tools_blueprint import tools_bp
from tools_catalog import TOOLS
from articles import ARTICLES, get_article
from case_studies import CASE_STUDIES, get_case_study


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
            phone TEXT,
            project_type TEXT,
            message TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_read INTEGER DEFAULT 0
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analytics_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_name TEXT NOT NULL,
            event_data TEXT,
            path TEXT,
            referrer TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Migration for databases created before the optional phone field existed.
    cursor.execute("PRAGMA table_info(inquiries)")
    columns = {row[1] for row in cursor.fetchall()}
    if 'phone' not in columns:
        cursor.execute("ALTER TABLE inquiries ADD COLUMN phone TEXT")
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
    response.headers['Strict-Transport-Security'] = 'max-age=31536000'
    response.headers['Permissions-Policy'] = (
        'camera=(), microphone=(), geolocation=(), payment=(), usb=(), '
        'accelerometer=(), gyroscope=(), magnetometer=()'
    )
    response.headers['Server'] = 'ShajjadKhan-Platform/2.0'

    if request.path.startswith('/tools'):
        # AdSense injects inline scripts and loads from Google ad domains.
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "base-uri 'self'; "
            "object-src 'none'; "
            "frame-ancestors 'self'; "
            "form-action 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
            "https://pagead2.googlesyndication.com https://*.googlesyndication.com "
            "https://*.google.com https://*.doubleclick.net https://*.googleadservices.com "
            "https://*.adtrafficquality.google https://*.gstatic.com; "
            "style-src 'self' 'unsafe-inline' https://*.google.com https://*.googlesyndication.com; "
            "img-src 'self' data: blob: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://pagead2.googlesyndication.com "
            "https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net "
            "https://*.googleadservices.com https://*.adtrafficquality.google https://*.gstatic.com; "
            "frame-src https://*.google.com https://*.googlesyndication.com "
            "https://*.doubleclick.net https://*.googleadservices.com "
            "https://*.adtrafficquality.google https://*.gstatic.com; "
            "worker-src 'self' blob:; "
            "manifest-src 'self'; "
            "media-src 'self'; "
            "upgrade-insecure-requests"
        )
    else:
        # The portfolio is ad-free and self-hosts every font, icon, and script.
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "base-uri 'self'; "
            "object-src 'none'; "
            "frame-ancestors 'self'; "
            "form-action 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "worker-src 'self' blob:; "
            "manifest-src 'self'; "
            "media-src 'self'; "
            "upgrade-insecure-requests"
        )
    return response

@app.route('/')
def home():
    """Renders the official portfolio homepage for www.shajjadkhan.com (100% ad-free)."""
    return render_template(
        'index.html',
        year=datetime.datetime.now().year,
        tools_url='/tools'
    )

@app.route('/work')
def work():
    """Case studies index: architectural deep dives and production outcomes."""
    return render_template(
        'work/index.html',
        case_studies=CASE_STUDIES,
        year=datetime.datetime.now().year,
        tools_url='/tools'
    )


@app.route('/work/<slug>')
def work_case_study(slug):
    """Individual case study page."""
    cs = get_case_study(slug)
    if not cs:
        abort(404)
    return render_template(
        'work/case_study.html',
        cs=cs,
        case_studies=CASE_STUDIES,
        year=datetime.datetime.now().year,
        tools_url='/tools'
    )


@app.route('/compare')
@app.route('/compare/tawreedflow-vs-whatsapp-excel')
def compare_tawreedflow():
    """Commercial comparison landing page: TawreedFlow vs WhatsApp & Excel."""
    return render_template(
        'compare/tawreedflow_vs_whatsapp.html',
        year=datetime.datetime.now().year,
        tools_url='/tools'
    )


@app.route('/calculator')
@app.route('/calculator/hotel-procurement-roi')
def calculator_roi():
    """Interactive GCC hotel procurement ROI and cost savings calculator."""
    return render_template(
        'calculator/roi.html',
        year=datetime.datetime.now().year,
        tools_url='/tools'
    )


@app.route('/writing')
def writing():
    """Writing index: practical notes on procurement, architecture, and delivery."""
    return render_template(
        'writing/index.html',
        articles=ARTICLES,
        year=datetime.datetime.now().year,
        tools_url='/tools'
    )


@app.route('/writing/<slug>')
def writing_article(slug):
    """Individual article page."""
    article = get_article(slug)
    if not article:
        abort(404)
    return render_template(
        'writing/article.html',
        article=article,
        articles=ARTICLES,
        year=datetime.datetime.now().year,
        tools_url='/tools'
    )


@app.route('/writing/rss.xml')
def writing_rss():
    """RSS 2.0 feed for the writing section."""
    def rfc822(date_string):
        published = datetime.datetime.strptime(date_string, '%Y-%m-%d').replace(
            tzinfo=datetime.timezone.utc
        )
        return format_datetime(published)

    items = []
    for article in ARTICLES:
        link = f"{SITE_URL}/writing/{article['slug']}"
        items.append(
            "    <item>\n"
            f"      <title>{escape(article['title'])}</title>\n"
            f"      <link>{escape(link)}</link>\n"
            f"      <guid isPermaLink=\"true\">{escape(link)}</guid>\n"
            f"      <pubDate>{rfc822(article['date'])}</pubDate>\n"
            f"      <category>{escape(article['category'])}</category>\n"
            f"      <description>{escape(article['description'])}</description>\n"
            "    </item>"
        )

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        '  <channel>\n'
        '    <title>Shajjad Khan — Writing</title>\n'
        f'    <link>{SITE_URL}/writing</link>\n'
        f'    <atom:link href="{SITE_URL}/writing/rss.xml" rel="self" type="application/rss+xml" />\n'
        '    <description>Practical notes on procurement software, hospitality operations, and systems architecture.</description>\n'
        '    <language>en</language>\n'
        f'    <lastBuildDate>{rfc822(ARTICLES[0]["date"])}</lastBuildDate>\n'
        + "\n".join(items)
        + "\n  </channel>\n"
        "</rss>\n"
    )
    return Response(xml, mimetype='application/rss+xml')


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
    company = (data.get('company') or data.get('organization') or '').strip()
    phone = (data.get('phone') or '').strip()
    project_type = (data.get('project_type') or data.get('service') or 'General Inquiry').strip()
    message = (data.get('message') or '').strip()
    honeypot = (data.get('website') or '').strip()

    # Hidden field: humans never see it. Return a normal success response to bots.
    if honeypot:
        return jsonify({
            "status": "success",
            "message": "Thank you! Your message has been received."
        })

    # Validation
    if not name or not email or not message:
        return jsonify({
            "status": "error",
            "message": "Please fill in your Name, Email, and Message."
        }), 400

    if len(name) > 80 or len(email) > 100 or len(company) > 100 or len(phone) > 40 \
            or len(project_type) > 80 or len(message) > 3000:
        return jsonify({
            "status": "error",
            "message": "One or more fields are too long. Please shorten them and try again."
        }), 400
        
    email_regex = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if not re.match(email_regex, email):
        return jsonify({
            "status": "error",
            "message": "Please enter a valid email address."
        }), 400

    forwarded = request.headers.get('X-Forwarded-For', '')
    ip_address = (forwarded.split(',')[0].strip() if forwarded else request.remote_addr) or 'unknown'
    user_agent = request.headers.get('User-Agent', '')[:250]

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM inquiries WHERE ip_address = ? "
            "AND created_at >= datetime('now', '-10 minutes')",
            (ip_address,)
        )
        if cursor.fetchone()[0] >= 3:
            return jsonify({
                "status": "error",
                "message": "Too many inquiries from this connection. Please try again in a few minutes or email directly."
            }), 429

        cursor.execute("""
            INSERT INTO inquiries (name, email, company, phone, project_type, message, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (name, email, company, phone, project_type, message, ip_address, user_agent))
        conn.commit()
        
        return jsonify({
            "status": "success",
            "message": f"Thank you, {name}! Your message has been received. Shajjad Khan will respond promptly."
        })
    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to save inquiry at this moment. Please try again or email directly."
        }), 500
    finally:
        conn.close()

@app.route('/api/event', methods=['POST'])
def track_event():
    """Privacy-first first-party analytics event ingestion (cookieless, PDPL/GDPR compliant)."""
    data = request.get_json(silent=True) or request.form or {}
    event_name = (data.get('event_name') or data.get('event') or '').strip()[:64]
    if not event_name:
        return jsonify({"status": "error", "message": "Missing event name"}), 400

    event_data = str(data.get('event_data') or data.get('data') or '')[:512]
    path = (data.get('path') or request.headers.get('Referer', '') or '')[:256]
    referrer = (data.get('referrer') or '')[:256]

    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO analytics_events (event_name, event_data, path, referrer) VALUES (?, ?, ?, ?)",
            (event_name, event_data, path, referrer)
        )
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "event": event_name}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": "Failed to record event"}), 500

@app.route('/api/event/stats')
def event_stats():
    """Summary counts of conversion events (public aggregate counts for monitoring)."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT event_name, COUNT(*) as count 
            FROM analytics_events 
            GROUP BY event_name 
            ORDER BY count DESC
        """)
        rows = cursor.fetchall()
        conn.close()
        return jsonify({
            "status": "success",
            "events": {row['event_name']: row['count'] for row in rows}
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

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

    def add(loc, changefreq, priority, lastmod=None):
        entries.append(
            f"  <url>\n"
            f"    <loc>{escape(loc)}</loc>\n"
            f"    <lastmod>{lastmod or SITEMAP_LASTMOD}</lastmod>\n"
            f"    <changefreq>{changefreq}</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            f"  </url>"
        )

    add(f"{SITE_URL}/", "weekly", "1.0")
    add(f"{SITE_URL}/work", "weekly", "0.9")
    for cs in CASE_STUDIES:
        add(f"{SITE_URL}/work/{cs['slug']}", "monthly", "0.8")
    add(f"{SITE_URL}/compare/tawreedflow-vs-whatsapp-excel", "monthly", "0.8", "2026-10-26")
    add(f"{SITE_URL}/calculator/hotel-procurement-roi", "monthly", "0.8", "2026-10-26")
    add(f"{SITE_URL}/writing", "weekly", "0.8", ARTICLES[0]["date"])
    for article in ARTICLES:
        add(f"{SITE_URL}/writing/{article['slug']}", "monthly", "0.7", article["date"])
    add(f"{SITE_URL}/tools", "daily", "0.9")

    # About is currently a homepage section.
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

