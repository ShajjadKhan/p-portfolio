"""Case study metadata for the /work section.

Detailed narrative and architectural walkthroughs live in templates/work/studies/<slug>.html
to keep templates clean, maintainable, and version-controllable.
"""

CASE_STUDIES = [
    {
        "slug": "tawreedflow",
        "title": "TawreedFlow: Multi-Tenant Enterprise Procurement SaaS for GCC Hospitality",
        "short_title": "TawreedFlow Enterprise",
        "category": "Flagship SaaS",
        "status": "Live Production",
        "year": "2026",
        "tagline": "Replacing un-audited WhatsApp purchasing with end-to-end requisitions, multi-tier approvals, automated RFQs, and PO dispatch across GCC hotel networks.",
        "client_profile": "Luxury hotel groups and multi-property hospitality operators in Saudi Arabia, UAE, and Qatar.",
        "role": "Founder, Product Designer & Systems Architect",
        "metrics": [
            {"val": "2", "label": "Live Hotel Properties"},
            {"val": "234", "label": "Verified Orders Delivered"},
            {"val": "57", "label": "Requisitions In Delivery"},
            {"val": "100%", "label": "Audit Trail Compliance"}
        ],
        "tech_stack": [
            "Python", "Django 6.0", "PostgreSQL", "MySQL", "Redis",
            "Celery", "WhatsApp Cloud API", "VAPID WebPush", "Linux"
        ],
        "live_url": "https://tawreedflow.com",
        "featured": True
    },
    {
        "slug": "blocktree",
        "title": "BlockTree: 2D Spatial Editorial Hypergraph & Knowledge Matrix",
        "short_title": "BlockTree Matrix",
        "category": "Spatial Systems",
        "status": "Production",
        "year": "2026",
        "tagline": "Branching discourse platform featuring infinite 2D canvas navigation, 360° virtual joystick physics, and live WYSIWYG typography.",
        "client_profile": "Decentralized editorial networks, research organizations, and publication hubs.",
        "role": "Systems Architect & Full-Stack Engineer",
        "metrics": [
            {"val": "360°", "label": "Virtual Joystick Physics"},
            {"val": "<15ms", "label": "Radial Collision Loop"},
            {"val": "2FA", "label": "RFC 6238 TOTP Security"},
            {"val": "WAL", "label": "High-Concurrency SQLite"}
        ],
        "tech_stack": [
            "Python", "Flask", "SQLite WAL", "HTML5 Canvas",
            "Panzoom", "Web Cryptography", "Vanilla JS"
        ],
        "live_url": None,
        "featured": False
    },
    {
        "slug": "fasttrack",
        "title": "FastTrack Tools: High-Performance 100% Client-Side Utility Platform",
        "short_title": "FastTrack Tools Suite",
        "category": "Utility Infrastructure",
        "status": "Active (50+ Tools)",
        "year": "2026",
        "tagline": "50+ browser-native utilities processing PDFs, DWG/DXF CAD blueprints, images, and SEO sitemaps without sending data to third-party servers.",
        "client_profile": "Global engineers, architects, operations managers, and data analysts.",
        "role": "Lead Architect & Performance Engineer",
        "metrics": [
            {"val": "50+", "label": "Active Browser Tools"},
            {"val": "0 B", "label": "Server File Uploads"},
            {"val": "60 FPS", "label": "Vector Rendering"},
            {"val": "100%", "label": "Client Data Privacy"}
        ],
        "tech_stack": [
            "Python", "Flask", "Web Workers", "HTML5 Canvas",
            "LibreDWG", "PDF.js", "PDF-Lib", "WebAssembly"
        ],
        "live_url": "/tools",
        "featured": False
    },
    {
        "slug": "isp",
        "title": "ISP Telecom Billing & Dynamic MikroTik RouterOS Bandwidth Engine",
        "short_title": "ISP Billing & MikroTik Automation",
        "category": "Telecom / Networking",
        "status": "Production",
        "year": "2025–2026",
        "tagline": "High-throughput subscriber management, automated dynamic bandwidth queue shaping via RouterOS API, and automated WhatsApp reminder alerts.",
        "client_profile": "Regional wireless and fiber Internet Service Providers (ISPs).",
        "role": "Infrastructure & Backend Architect",
        "metrics": [
            {"val": "Real-time", "label": "RouterOS Queue Shaping"},
            {"val": "Automated", "label": "WhatsApp Invoice Dispatch"},
            {"val": "Captive", "label": "Hotspot Overdue Portal"},
            {"val": "Zero-Loss", "label": "FreeRADIUS Accounting"}
        ],
        "tech_stack": [
            "Python", "PHP", "MySQL", "MikroTik API",
            "FreeRADIUS", "RouterOS", "Bash Automation"
        ],
        "live_url": None,
        "featured": False
    },
    {
        "slug": "hr",
        "title": "Enterprise Multi-Branch HR & Biometric Automated Payroll System",
        "short_title": "Enterprise HR & Automated Payroll",
        "category": "Enterprise Systems",
        "status": "Production",
        "year": "2025–2026",
        "tagline": "Multi-location human resource platform integrating biometric hardware clocks, hierarchical leave approval chains, and automated payroll pay slips.",
        "client_profile": "Multi-branch commercial corporations and regional hospitality groups.",
        "role": "Backend Engineer & Architect",
        "metrics": [
            {"val": "Multi-Branch", "label": "Biometric Hardware Sync"},
            {"val": "Automated", "label": "Monthly Payroll Generation"},
            {"val": "Hierarchical", "label": "Leave Approval Workflows"},
            {"val": "Instant", "label": "PDF Pay Slip Dispatch"}
        ],
        "tech_stack": [
            "Python", "Django", "PostgreSQL", "TailwindCSS",
            "ZKTeco API", "Celery", "Linux"
        ],
        "live_url": None,
        "featured": False
    }
]


def get_case_study(slug):
    """Retrieve a single case study by slug."""
    for cs in CASE_STUDIES:
        if cs["slug"] == slug:
            return cs
    return None
