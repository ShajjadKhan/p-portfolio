"""
tools_blueprint.py - Modular FastTrack Tools Blueprint for Shajjad Khan Portfolio
Mounted at /tools
"""

import os
import io
import time
import xml.etree.ElementTree as ET
from urllib.parse import urlparse
from datetime import datetime

from flask import (
    Blueprint,
    render_template,
    request,
    jsonify,
    send_file,
    Response,
    abort
)
import requests
from PIL import Image
from pypdf import PdfWriter, PdfReader

from tools_catalog import CATEGORIES, TOOLS, get_tool_by_slug, get_tools_by_category

tools_bp = Blueprint('tools', __name__)


@tools_bp.context_processor
def inject_tools_vars():
    """Inject AdSense Publisher ID and metadata into tools templates."""
    pub_id = os.environ.get('ADSENSE_PUB_ID', 'ca-pub-XXXXXXXXXXXXXXXX')
    return {
        'adsense_pub_id': pub_id,
        'adsense_slots': {
            'top_leaderboard': os.environ.get('ADSENSE_SLOT_TOP_LEADERBOARD', '1001001001'),
            'bottom_leaderboard': os.environ.get('ADSENSE_SLOT_BOTTOM_LEADERBOARD', '2002002002'),
            'grid_primary': os.environ.get('ADSENSE_SLOT_GRID_PRIMARY', '3003003001'),
            'grid_secondary': os.environ.get('ADSENSE_SLOT_GRID_SECONDARY', '3003003002'),
            'workspace': os.environ.get('ADSENSE_SLOT_WORKSPACE', '4004004004'),
            'mid_content': os.environ.get('ADSENSE_SLOT_MID_CONTENT', '5005005005'),
            'sticky_anchor': os.environ.get('ADSENSE_SLOT_STICKY_ANCHOR', '6006006006'),
            'side_left': os.environ.get('ADSENSE_SLOT_SIDE_LEFT', '7007007001'),
            'side_right': os.environ.get('ADSENSE_SLOT_SIDE_RIGHT', '7007007002'),
        },
        'current_year': datetime.utcnow().year,
        'portfolio_url': '/',
        'tools_base_url': '/tools'
    }


# --- Page Routes ---

@tools_bp.route('/', strict_slashes=False)
@tools_bp.route('', strict_slashes=False)
def index():
    """
    Direct-showing tools catalog.
    No verbose fluff - direct instant search and all 32 utilities displayed immediately.
    """
    total_tools = len(TOOLS)
    client_tools = sum(1 for t in TOOLS if t.get('client_powered', False))
    return render_template(
        'tools/index.html',
        categories=CATEGORIES,
        tools=TOOLS,
        total_tools=total_tools,
        client_tools=client_tools,
        active_category='all'
    )


@tools_bp.route('/<slug>')
def view_tool(slug):
    """Direct workspace for a specific tool."""
    tool = get_tool_by_slug(slug)
    if not tool:
        abort(404)

    # Pick 4 related tools from the same category
    category_tools = [t for t in TOOLS if t['category'] == tool['category'] and t['id'] != tool['id']]
    related = category_tools[:4]
    if len(related) < 4:
        others = [t for t in TOOLS if t['id'] != tool['id'] and t not in related]
        related.extend(others[:4 - len(related)])

    return render_template(
        'tools/tool.html',
        tool=tool,
        categories=CATEGORIES,
        all_tools=TOOLS,
        related_tools=related
    )


@tools_bp.route('/privacy')
def privacy_policy():
    """Privacy policy required for Google AdSense & GDPR."""
    return render_template('tools/privacy.html')


@tools_bp.route('/terms')
def terms_of_service():
    """Terms of service required for AdSense approval."""
    return render_template('tools/terms.html')


# --- API Endpoints ---

@tools_bp.route('/api/list')
def api_get_tools():
    """Return JSON catalog of all available tools."""
    cat = request.args.get('category', 'all')
    filtered = get_tools_by_category(cat)
    return jsonify({
        "status": "success",
        "count": len(filtered),
        "tools": filtered
    })


@tools_bp.route('/api/sitemap-audit', methods=['POST'])
def api_sitemap_audit():
    """Audit and validate an XML Sitemap from URL or raw text."""
    data = request.get_json(silent=True) or {}
    url = data.get('url', '').strip()
    raw_xml = data.get('xml_content', '').strip()

    if not url and not raw_xml:
        return jsonify({
            "status": "error",
            "message": "Please provide either a sitemap URL or paste raw XML content."
        }), 400

    xml_text = raw_xml
    fetch_latency_ms = None

    if url:
        if not (url.startswith('http://') or url.startswith('https://')):
            url = 'https://' + url

        try:
            start_time = time.time()
            headers = {
                'User-Agent': 'Mozilla/5.0 (compatible; FastTrackToolsSitemapAuditor/1.0; +https://www.shajjadkhan.com)'
            }
            resp = requests.get(url, headers=headers, timeout=12, verify=True)
            fetch_latency_ms = int((time.time() - start_time) * 1000)

            if resp.status_code != 200:
                return jsonify({
                    "status": "error",
                    "message": f"Failed to fetch sitemap: HTTP {resp.status_code} {resp.reason}",
                    "http_status": resp.status_code
                }), 400

            xml_text = resp.text
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"Connection error fetching sitemap URL: {str(e)}"
            }), 400

    # Parse XML
    try:
        xml_clean = xml_text.strip()
        if xml_clean.startswith('\ufeff'):
            xml_clean = xml_clean[1:]

        root = ET.fromstring(xml_clean)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"XML Syntax Parse Error: {str(e)}",
            "raw_preview": xml_text[:300]
        }), 400

    tag_clean = root.tag.split('}')[-1] if '}' in root.tag else root.tag
    is_index = (tag_clean == 'sitemapindex')

    urls_extracted = []
    seen_urls = set()
    duplicate_count = 0
    http_insecure_count = 0
    depth_counts = {"root": 0, "depth_1": 0, "depth_2": 0, "depth_3_plus": 0}
    priority_values = []
    changefreq_counts = {}

    ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    elements = root.findall('.//sm:url', ns) or root.findall('.//url')
    if is_index:
        elements = root.findall('.//sm:sitemap', ns) or root.findall('.//sitemap')

    for elem in elements:
        loc_elem = elem.find('sm:loc', ns) if elem.find('sm:loc', ns) is not None else elem.find('loc')
        lastmod_elem = elem.find('sm:lastmod', ns) if elem.find('sm:lastmod', ns) is not None else elem.find('lastmod')
        freq_elem = elem.find('sm:changefreq', ns) if elem.find('sm:changefreq', ns) is not None else elem.find('changefreq')
        prio_elem = elem.find('sm:priority', ns) if elem.find('sm:priority', ns) is not None else elem.find('priority')

        loc = (loc_elem.text or '').strip() if loc_elem is not None else ''
        lastmod = (lastmod_elem.text or '').strip() if lastmod_elem is not None else None
        freq = (freq_elem.text or '').strip() if freq_elem is not None else None
        prio = (prio_elem.text or '').strip() if prio_elem is not None else None

        if not loc:
            continue

        if loc in seen_urls:
            duplicate_count += 1
        else:
            seen_urls.add(loc)

        if loc.startswith('http://'):
            http_insecure_count += 1

        parsed = urlparse(loc)
        path_segments = [p for p in parsed.path.split('/') if p]
        depth = len(path_segments)
        if depth == 0:
            depth_counts["root"] += 1
        elif depth == 1:
            depth_counts["depth_1"] += 1
        elif depth == 2:
            depth_counts["depth_2"] += 1
        else:
            depth_counts["depth_3_plus"] += 1

        if prio:
            try:
                p_val = float(prio)
                priority_values.append(p_val)
            except ValueError:
                pass

        if freq:
            changefreq_counts[freq] = changefreq_counts.get(freq, 0) + 1

        urls_extracted.append({
            "loc": loc,
            "lastmod": lastmod,
            "changefreq": freq,
            "priority": prio,
            "depth": depth
        })

    total_count = len(urls_extracted)
    warnings = []
    if duplicate_count > 0:
        warnings.append(f"Found {duplicate_count} duplicate URL(s). Sitemaps must have unique URLs.")
    if http_insecure_count > 0:
        warnings.append(f"Found {http_insecure_count} non-secure (HTTP) URL(s). Search engines strongly favor HTTPS.")
    if total_count > 50000:
        warnings.append("Sitemap exceeds standard 50,000 URL limit. Consider splitting into a sitemap index.")
    if total_count == 0:
        warnings.append("No URLs found in the sitemap. Check XML schema / namespace.")

    avg_priority = round(sum(priority_values) / len(priority_values), 2) if priority_values else None

    score = 100
    if duplicate_count > 0:
        score -= min(25, duplicate_count * 5)
    if http_insecure_count > 0:
        score -= min(25, http_insecure_count * 5)
    if total_count == 0:
        score = 0
    if len(warnings) > 2:
        score -= 10
    score = max(0, min(100, score))

    return jsonify({
        "status": "success",
        "sitemap_type": "sitemap_index" if is_index else "urlset",
        "fetch_latency_ms": fetch_latency_ms,
        "score": score,
        "summary": {
            "total_urls": total_count,
            "unique_urls": len(seen_urls),
            "duplicates": duplicate_count,
            "insecure_http": http_insecure_count,
            "avg_priority": avg_priority,
            "depth_distribution": depth_counts,
            "changefreq_distribution": changefreq_counts
        },
        "warnings": warnings,
        "urls": urls_extracted[:100],
        "truncated": total_count > 100
    })


@tools_bp.route('/api/pdf/merge', methods=['POST'])
def api_pdf_merge():
    """Server-side PDF merge fallback."""
    files = request.files.getlist('pdf_files')
    if not files or len(files) < 2:
        return jsonify({"status": "error", "message": "At least 2 PDF files are required."}), 400

    try:
        writer = PdfWriter()
        for f in files:
            reader = PdfReader(f.stream)
            for page in reader.pages:
                writer.add_page(page)

        output_stream = io.BytesIO()
        writer.write(output_stream)
        output_stream.seek(0)

        filename = f"merged_document_{int(time.time())}.pdf"
        return send_file(
            output_stream,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
    except Exception as e:
        return jsonify({"status": "error", "message": f"PDF merge failed: {str(e)}"}), 500


@tools_bp.route('/api/pdf/images-to-pdf', methods=['POST'])
def api_images_to_pdf():
    """Server-side Image to PDF fallback."""
    files = request.files.getlist('image_files')
    if not files:
        return jsonify({"status": "error", "message": "No images uploaded."}), 400

    try:
        pil_images = []
        for f in files:
            img = Image.open(f.stream)
            if img.mode in ('RGBA', 'LA', 'P'):
                bg = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                bg.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                pil_images.append(bg)
            else:
                pil_images.append(img.convert('RGB'))

        if not pil_images:
            return jsonify({"status": "error", "message": "Valid images required."}), 400

        output_stream = io.BytesIO()
        first_img = pil_images[0]
        other_images = pil_images[1:]

        first_img.save(
            output_stream,
            format='PDF',
            save_all=True,
            append_images=other_images,
            quality=95
        )
        output_stream.seek(0)

        filename = f"converted_images_{int(time.time())}.pdf"
        return send_file(
            output_stream,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
    except Exception as e:
        return jsonify({"status": "error", "message": f"Conversion error: {str(e)}"}), 500
