"""Article metadata for the /writing section.

Article bodies live in templates/writing/articles/<slug>.html so the content
stays readable and reviewable without adding a Markdown dependency.
"""

ARTICLES = [
    {
        "slug": "gcc-hotel-procurement-software",
        "title": "Where hotel procurement spreadsheets break — and what software must fix",
        "description": (
            "A practical look at the failure points in multi-property hotel "
            "procurement: approvals, item masters, receiving, and audit trails."
        ),
        "category": "Procurement",
        "date": "2026-10-26",
        "date_display": "26 October 2026",
        "reading_time": 8,
        "featured": True,
        "keywords": [
            "hotel procurement software",
            "GCC hospitality procurement",
            "purchase requisitions",
            "multi-property purchasing",
        ],
    },
    {
        "slug": "zatca-e-invoicing-hotel-procurement",
        "title": "ZATCA e-invoicing readiness for hotel procurement teams",
        "description": (
            "How procurement, receiving, and accounts payable need to change "
            "before ZATCA Phase 2 integration becomes an operational bottleneck."
        ),
        "category": "Compliance",
        "date": "2026-10-19",
        "date_display": "19 October 2026",
        "reading_time": 8,
        "featured": False,
        "keywords": [
            "ZATCA e-invoicing",
            "Fatoora integration",
            "Saudi hotel procurement",
            "VAT compliance",
        ],
    },
    {
        "slug": "multi-tenant-django-property-isolation",
        "title": "Multi-tenant Django for hotel groups: isolating properties without cloning the app",
        "description": (
            "Shared database, schema-per-tenant, or database-per-tenant? A "
            "practical model for property hierarchies, permissions, and reporting."
        ),
        "category": "Architecture",
        "date": "2026-10-12",
        "date_display": "12 October 2026",
        "reading_time": 9,
        "featured": False,
        "keywords": [
            "multi-tenant Django",
            "hotel property isolation",
            "SaaS architecture",
            "tenant permissions",
        ],
    },
    {
        "slug": "ai-assisted-delivery-review",
        "title": "AI-assisted delivery without shipping unreviewed code",
        "description": (
            "A review-first workflow for using AI in production software: small "
            "diffs, tests, migrations, secrets, and human accountability."
        ),
        "category": "Engineering",
        "date": "2026-10-05",
        "date_display": "5 October 2026",
        "reading_time": 7,
        "featured": False,
        "keywords": [
            "AI-assisted development",
            "code review",
            "production engineering",
            "software delivery",
        ],
    },
    {
        "slug": "hotel-network-mikrotik-tr069",
        "title": "Managing distributed hotel networks with MikroTik and TR-069",
        "description": (
            "A practical operating model for guest Wi-Fi, property VLANs, "
            "zero-touch CPE provisioning, and firmware discipline across sites."
        ),
        "category": "Infrastructure",
        "date": "2026-09-28",
        "date_display": "28 September 2026",
        "reading_time": 8,
        "featured": False,
        "keywords": [
            "MikroTik hotel network",
            "TR-069 ACS",
            "guest Wi-Fi",
            "hospitality infrastructure",
        ],
    },
]


def get_article(slug):
    """Return one article by slug, or None."""
    return next((article for article in ARTICLES if article["slug"] == slug), None)
