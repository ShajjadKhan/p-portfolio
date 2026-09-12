"""
tools_catalog.py - Catalog and metadata for all FastTrack Tools
"""

CATEGORIES = [
    {"id": "all", "name": "All Tools", "icon": "⚡", "color": "var(--accent)"},
    {"id": "pdf", "name": "PDF Suite", "icon": "📄", "color": "#ef4444"},
    {"id": "image", "name": "Image & Media", "icon": "🖼️", "color": "#8b5cf6"},
    {"id": "business", "name": "Business & Finance", "icon": "📊", "color": "#10b981"},
    {"id": "web", "name": "SEO & Web", "icon": "🌐", "color": "#06b6d4"},
    {"id": "dev", "name": "Security & Dev", "icon": "🔐", "color": "#f59e0b"},
    {"id": "content", "name": "Text & Content", "icon": "📝", "color": "#ec4899"},
    {"id": "converters", "name": "Calculators & Units", "icon": "📐", "color": "#3b82f6"}
]

TOOLS = [
    # --- PDF Suite ---
    {
        "id": "jpg-to-pdf",
        "slug": "jpg-to-pdf",
        "title": "JPG & Images to PDF",
        "category": "pdf",
        "badge": "Popular",
        "icon": "🖼️➡️📄",
        "short_desc": "Convert JPG, PNG, and WebP images into a single, beautifully formatted PDF with custom margins and orientation.",
        "detailed_desc": "Batch convert your images into clean PDF documents. Reorder images with drag-and-drop, choose portrait or landscape orientation, fit to page or maintain original aspect ratio, and download instantly with zero server upload.",
        "keywords": ["jpg to pdf", "image to pdf", "png to pdf", "photos to pdf", "convert images to pdf", "batch pdf"],
        "client_powered": True
    },
    {
        "id": "pdf-merge",
        "slug": "pdf-merge",
        "title": "PDF Merge & Combine",
        "category": "pdf",
        "badge": "FastTrack",
        "icon": "📑",
        "short_desc": "Combine multiple PDF documents into a single consolidated file in the exact sequence you choose.",
        "detailed_desc": "Select two or more PDF files, rearrange their order using simple up/down controls, and merge them into one seamless document right in your browser.",
        "keywords": ["pdf merge", "combine pdf", "join pdf", "merge pdf online", "concatenate pdf"],
        "client_powered": True
    },
    {
        "id": "pdf-arrange",
        "slug": "pdf-arrange",
        "title": "PDF Page Arranger & Reorder",
        "category": "pdf",
        "badge": "Visual",
        "icon": "🗂️",
        "short_desc": "Visual drag-and-drop PDF page organizer: reorder pages, rotate clockwise/counter-clockwise, or delete unwanted pages.",
        "detailed_desc": "Upload any PDF to see full visual page thumbnails. Drag pages to rearrange their sequence, rotate individual pages by 90°, 180°, or 270°, delete unneeded pages, and export your newly structured document.",
        "keywords": ["pdf arrange", "pdf re-arranging", "reorder pdf pages", "rotate pdf", "delete pdf pages", "organize pdf"],
        "client_powered": True
    },
    {
        "id": "pdf-split",
        "slug": "pdf-split",
        "title": "PDF Splitter & Page Extractor",
        "category": "pdf",
        "badge": "Precision",
        "icon": "✂️",
        "short_desc": "Extract specific page ranges (e.g. 1-5, 8, 11-14) or split large PDF files into separate targeted files.",
        "detailed_desc": "Easily separate large PDF documents into smaller parts. Enter custom page ranges or select individual pages to extract into a clean new PDF.",
        "keywords": ["pdf split", "extract pdf pages", "separate pdf", "cut pdf", "split pdf pages"],
        "client_powered": True
    },
    {
        "id": "pdf-to-images",
        "slug": "pdf-to-images",
        "title": "PDF to Images (PNG / JPG)",
        "category": "pdf",
        "badge": "High-Res",
        "icon": "📄➡️🖼️",
        "short_desc": "Render and extract high-resolution PNG or JPG images from every page of your PDF file.",
        "detailed_desc": "Convert each page of a PDF document into crisp, high-definition standalone image files. Download all pages individually or preview them on-screen.",
        "keywords": ["pdf to images", "pdf to png", "pdf to jpg", "convert pdf to picture", "extract images from pdf"],
        "client_powered": True
    },

    # --- Image & Media ---
    {
        "id": "image-converter",
        "slug": "image-converter",
        "title": "Image Format Converter (JPG, PNG, WebP)",
        "category": "image",
        "badge": "Universal",
        "icon": "🔄",
        "short_desc": "Seamlessly convert between JPG, PNG, WebP, and BMP formats with custom quality and instant download.",
        "detailed_desc": "Transform your images into any standard web format. Convert JPG to PNG for transparency, PNG to JPG or WebP for smaller payloads, with live preview and quality control.",
        "keywords": ["jpg to png", "png to jpg", "webp converter", "image converter", "format converter", "convert image"],
        "client_powered": True
    },
    {
        "id": "image-resize",
        "slug": "image-resize",
        "title": "Photo Resizer & Dimension Scaler",
        "category": "image",
        "badge": "Instant",
        "icon": "📐",
        "short_desc": "Resize image dimensions by exact pixels or percentage while maintaining aspect ratio and sharpness.",
        "detailed_desc": "Scale photos to exact dimensions (width/height in px) or scale by percentage (25%, 50%, 75%). Includes presets for YouTube thumbnails, Instagram posts, Twitter banners, and LinkedIn avatars.",
        "keywords": ["photo resizing", "image resize", "scale photo", "change image size", "resize picture"],
        "client_powered": True
    },
    {
        "id": "image-compress",
        "slug": "image-compress",
        "title": "Photo Reducer & Compressor",
        "category": "image",
        "badge": "Lossless",
        "icon": "🗜️",
        "short_desc": "Reduce image file size significantly while preserving visual fidelity. Live before/after size and savings gauge.",
        "detailed_desc": "Optimize images for faster web load times. Fine-tune the compression level with a real-time savings counter showing exact bytes saved and percentage reduction.",
        "keywords": ["photo reducer", "image compressor", "reduce photo size", "compress image", "shrink photo size", "optimize image"],
        "client_powered": True
    },
    {
        "id": "image-crop",
        "slug": "image-crop",
        "title": "Image Cropper & Aspect Ratio Tool",
        "category": "image",
        "badge": "Creative",
        "icon": "✂️",
        "short_desc": "Crop photos to standard aspect ratios (1:1, 16:9, 4:3, 9:16) or custom freeform crop with rotation.",
        "detailed_desc": "Crop and trim photos with interactive guide boxes. Rotate 90 degrees or flip horizontally/vertically before exporting.",
        "keywords": ["crop photo", "image cropper", "aspect ratio crop", "rotate photo", "flip image"],
        "client_powered": True
    },
    {
        "id": "image-color-picker",
        "slug": "image-color-picker",
        "title": "Image Color Picker & Palette Extractor",
        "category": "image",
        "badge": "Palette",
        "icon": "🎨",
        "short_desc": "Inspect and pick exact pixel colors from any uploaded image in HEX, RGB, and HSL formats.",
        "detailed_desc": "Upload any photo, design, or screenshot and hover over any pixel to extract its exact color code. Automatically generates a 6-color dominant palette from the image.",
        "keywords": ["image color picker", "eyedropper", "extract palette", "hex from image", "color inspector"],
        "client_powered": True
    },

    # --- Business & Finance ---
    {
        "id": "profit-calculator",
        "slug": "profit-calculator",
        "title": "Profit Margin & Markup Calculator",
        "category": "business",
        "badge": "Essential",
        "icon": "💰",
        "short_desc": "Calculate Gross Margin %, Markup %, Revenue, and Net Profit with tax (VAT), discounts, and break-even metrics.",
        "detailed_desc": "Professional pricing tool for eCommerce and B2B founders. Calculate gross profit, margin percentage, markup percentage, VAT/sales tax adjustments, and break-even quantities with visual revenue breakdown bars.",
        "keywords": ["profit calculator", "margin calculator", "markup calculator", "gross profit", "ecommerce profit", "breakeven"],
        "client_powered": True
    },
    {
        "id": "saas-calculator",
        "slug": "saas-calculator",
        "title": "SaaS Metrics, MRR, ARR & LTV / CAC",
        "category": "business",
        "badge": "SaaS",
        "icon": "📈",
        "short_desc": "Model SaaS unit economics: calculate MRR, ARR, Churn Rate, Customer Lifetime Value (LTV), and CAC Payback.",
        "detailed_desc": "Input subscribers, ARPU (average revenue per user), churn rate, and acquisition costs to compute key enterprise metrics including LTV:CAC ratio and months to recover acquisition costs.",
        "keywords": ["saas calculator", "mrr calculator", "arr calculator", "ltv cac", "churn calculator", "saas metrics"],
        "client_powered": True
    },
    {
        "id": "discount-tax-calculator",
        "slug": "discount-tax-calculator",
        "title": "Discount, Coupon & VAT / Tax Calculator",
        "category": "business",
        "badge": "Commerce",
        "icon": "🏷️",
        "short_desc": "Calculate final discounted prices, compound discounts, sales tax / VAT additions, and total cash saved.",
        "detailed_desc": "Fast commercial calculator for calculating retail and wholesale discounts, multi-stage discounts (e.g. 20% off + 10% coupon), and local tax additions.",
        "keywords": ["discount calculator", "vat calculator", "tax calculator", "sales tax", "coupon calculator", "savings calculator"],
        "client_powered": True
    },
    {
        "id": "currency-converter",
        "slug": "currency-converter",
        "title": "Currency & Financial Converter",
        "category": "business",
        "badge": "Global",
        "icon": "💱",
        "short_desc": "Quick financial conversion between USD, EUR, GBP, SAR, AED, BDT, and benchmark crypto rates.",
        "detailed_desc": "Perform fast currency calculations and conversions across global and GCC enterprise currencies with custom rate overrides and quick percentage markup.",
        "keywords": ["currency converter", "fx calculator", "usd to sar", "usd to aed", "usd to bdt", "money converter"],
        "client_powered": True
    },

    # --- SEO & Web ---
    {
        "id": "sitemap-audit",
        "slug": "sitemap-audit",
        "title": "XML Sitemap Auditor & URL Inspector",
        "category": "web",
        "badge": "Audit",
        "icon": "🗺️",
        "short_desc": "Audit XML sitemaps: validate protocol conformance, check URLs, detect duplicates, and analyze site structure.",
        "detailed_desc": "Fetch any live sitemap URL or paste raw XML content. Analyzes total URLs, duplicate paths, priority distribution, last modified dates, and checks HTTP response statuses.",
        "keywords": ["site map audit", "sitemap auditor", "xml sitemap validator", "sitemap check", "seo sitemap", "url extractor"],
        "client_powered": False  # Backed by robust Flask API
    },
    {
        "id": "meta-tag-generator",
        "slug": "meta-tag-generator",
        "title": "Meta Tags & OpenGraph Previewer",
        "category": "web",
        "badge": "SEO",
        "icon": "🏷️",
        "short_desc": "Generate high-converting SEO meta tags and preview live social cards for Google, Twitter, LinkedIn, and Facebook.",
        "detailed_desc": "Fill in your webpage metadata and preview how Google Search results, Twitter Cards, Facebook feeds, and LinkedIn links will look before you publish. Generates copy-ready HTML tags.",
        "keywords": ["meta tag generator", "opengraph generator", "seo tags", "social preview", "twitter card generator"],
        "client_powered": True
    },
    {
        "id": "robots-generator",
        "slug": "robots-generator",
        "title": "Robots.txt Generator & Rule Tester",
        "category": "web",
        "badge": "Robots",
        "icon": "🤖",
        "short_desc": "Build standardized robots.txt directives for Googlebot, Bingbot, and AI crawlers with sitemap linkage.",
        "detailed_desc": "Easily configure allow/disallow paths for web crawlers, add sitemap declarations, control AI scrapers (GPTBot, ClaudeBot), and test specific URLs against your rules.",
        "keywords": ["robots.txt generator", "robots tester", "crawl rules", "seo robots", "disallow bots"],
        "client_powered": True
    },
    {
        "id": "url-parser",
        "slug": "url-parser",
        "title": "URL Parser & Query String Builder",
        "category": "web",
        "badge": "Web Dev",
        "icon": "🔗",
        "short_desc": "Deconstruct complex URLs into protocol, host, port, path, query parameters, and hash with a visual editor.",
        "detailed_desc": "Analyze any URL structure, edit query parameters in an interactive key-value table, encode/decode special characters, and assemble clean final URLs.",
        "keywords": ["url parser", "query string editor", "url parameters", "utm builder", "url deconstruct"],
        "client_powered": True
    },

    # --- Security & Dev ---
    {
        "id": "qr-generator",
        "slug": "qr-generator",
        "title": "QR Code Studio & Generator",
        "category": "dev",
        "badge": "Custom",
        "icon": "📱",
        "short_desc": "Generate custom styled QR codes for URLs, WiFi credentials, vCard contacts, WhatsApp, and plain text.",
        "detailed_desc": "Create crisp, high-resolution QR codes. Choose error correction levels (L/M/Q/H), customize foreground/background colors, set custom pixel dimensions, and download as PNG.",
        "keywords": ["qr code generator", "wifi qr code", "vcard qr", "make qr code", "free qr generator"],
        "client_powered": True
    },
    {
        "id": "json-tools",
        "slug": "json-tools",
        "title": "JSON Formatter, Validator & Minifier",
        "category": "dev",
        "badge": "Dev Essential",
        "icon": "{ }",
        "short_desc": "Format, beautify, validate, and minify JSON data with instant syntax error highlighting and path inspection.",
        "detailed_desc": "Paste raw or messy JSON to instantly beautify with 2 or 4 spaces, or compact into a single line. Flags exact line and column of parsing errors.",
        "keywords": ["json formatter", "json validator", "json minifier", "beautify json", "clean json", "format json"],
        "client_powered": True
    },
    {
        "id": "password-generator",
        "slug": "password-generator",
        "title": "Secure Password & Passphrase Generator",
        "category": "dev",
        "badge": "Entropy",
        "icon": "🔑",
        "short_desc": "Generate cryptographically secure passwords and memorable Diceware passphrases with entropy score.",
        "detailed_desc": "Uses crypto.getRandomValues for true cryptographic security. Toggle symbols, numbers, mixed case, ambiguous characters, or generate memorable word-based passphrases.",
        "keywords": ["password generator", "passphrase generator", "secure password", "random string", "entropy generator"],
        "client_powered": True
    },
    {
        "id": "hash-generator",
        "slug": "hash-generator",
        "title": "Hash Generator (MD5, SHA-256, SHA-512)",
        "category": "dev",
        "badge": "Crypto",
        "icon": "🔒",
        "short_desc": "Compute MD5, SHA-1, SHA-256, and SHA-512 cryptographic hashes from any text or uploaded file.",
        "detailed_desc": "Compute cryptographic checksums and digital fingerprints instantly. Compare target hashes with source text to verify data integrity.",
        "keywords": ["hash generator", "sha256 generator", "md5 generator", "sha512", "checksum tool"],
        "client_powered": True
    },
    {
        "id": "base64-tools",
        "slug": "base64-tools",
        "title": "Base64 Encoder & Decoder (Text / Image)",
        "category": "dev",
        "badge": "Encoding",
        "icon": "🔤",
        "short_desc": "Encode and decode plain text or convert images directly into Base64 Data URI strings for HTML/CSS.",
        "detailed_desc": "Convert text to Base64 and back with UTF-8 support. Upload any image to obtain the exact `data:image/...;base64,...` snippet for embedding directly in stylesheets or code.",
        "keywords": ["base64 encoder", "base64 decoder", "image to base64", "data uri generator", "base64 text"],
        "client_powered": True
    },
    {
        "id": "uuid-generator",
        "slug": "uuid-generator",
        "title": "UUID / GUID v4 Batch Generator",
        "category": "dev",
        "badge": "Bulk",
        "icon": "🆔",
        "short_desc": "Generate RFC 4122 compliant version-4 UUIDs / GUIDs individually or in bulk (up to 500 at once).",
        "detailed_desc": "Generate cryptographically random UUID v4 strings. Toggle uppercase/lowercase, hyphens, and copy as array, newline list, or comma-separated.",
        "keywords": ["uuid generator", "guid generator", "v4 uuid", "random uuid", "batch uuid"],
        "client_powered": True
    },
    {
        "id": "jwt-decoder",
        "slug": "jwt-decoder",
        "title": "JWT Token Decoder & Expiration Inspector",
        "category": "dev",
        "badge": "Auth",
        "icon": "🎟️",
        "short_desc": "Decode JSON Web Tokens (JWT) locally to inspect header algorithms, payload claims, and expiration dates.",
        "detailed_desc": "Inspect JWT tokens in 100% privacy without sending tokens to any external server. Displays human-readable expiration status (Active / Expired) and parsed claims.",
        "keywords": ["jwt decoder", "decode jwt", "json web token", "jwt claims", "jwt inspect"],
        "client_powered": True
    },
    {
        "id": "dwg-viewer",
        "slug": "dwg-viewer",
        "title": "DWG & CAD Blueprint File Viewer",
        "category": "dev",
        "badge": "CAD Pro",
        "icon": "📐",
        "short_desc": "Interactive GUI viewer for AutoCAD DWG and DXF engineering drawings with zoom, pan, layers, crosshairs, distance measurement, and export.",
        "detailed_desc": "Open and inspect AutoCAD DWG and DXF technical drawings directly in your browser with a responsive CAD GUI. Features 60 FPS vector canvas, layer visibility manager, world coordinate crosshair HUD, interactive distance measurement tool, CAD background themes (AutoCAD Dark, Blueprint Cyan, Clean White, Matrix Green), entity inspector, and instant export to high-res PNG, SVG, or DXF.",
        "keywords": ["dwg viewer", "cad viewer", "dwg file viewer", "autocad viewer", "dxf viewer", "blueprint viewer", "open dwg online", "dwg to svg", "cad drawing inspector", "engineering drawing viewer"],
        "client_powered": True
    },

    # --- Text & Content ---
    {
        "id": "markdown-editor",
        "slug": "markdown-editor",
        "title": "Markdown Live Editor & HTML Preview",
        "category": "content",
        "badge": "Live Sync",
        "icon": "📝",
        "short_desc": "Dual-pane live Markdown editor with instant HTML preview, word count, and one-click HTML copy.",
        "detailed_desc": "Write GitHub Flavored Markdown on the left with live rendered HTML preview on the right. Includes cheat sheet, table support, and export to HTML or Markdown file.",
        "keywords": ["markdown editor", "markdown to html", "markdown preview", "gfm editor", "md viewer"],
        "client_powered": True
    },
    {
        "id": "text-diff",
        "slug": "text-diff",
        "title": "Text Diff & Comparison Checker",
        "category": "content",
        "badge": "Diff",
        "icon": "🔍",
        "short_desc": "Compare two blocks of text side-by-side or unified with color-coded additions, deletions, and edits.",
        "detailed_desc": "Find differences between text, code snippets, or configurations. Highlights exact character and line-level changes with split and inline viewing modes.",
        "keywords": ["text diff", "diff checker", "compare text", "text comparison", "string diff"],
        "client_powered": True
    },
    {
        "id": "word-counter",
        "slug": "word-counter",
        "title": "Word, Character & Reading Time Counter",
        "category": "content",
        "badge": "Telemetry",
        "icon": "📊",
        "short_desc": "Real-time metrics: words, characters (with/without spaces), sentences, paragraphs, reading and speaking times.",
        "detailed_desc": "Comprehensive copy analysis tool. Shows estimated reading time (200 wpm), speaking time (130 wpm), character density, and top keyword frequencies.",
        "keywords": ["word counter", "character counter", "reading time calculator", "text statistics", "letter count"],
        "client_powered": True
    },
    {
        "id": "case-converter",
        "slug": "case-converter",
        "title": "Text Case Converter (Camel, Snake, Title)",
        "category": "content",
        "badge": "Formatting",
        "icon": "Aa",
        "short_desc": "Transform text across UPPERCASE, lowercase, Title Case, camelCase, snake_case, kebab-case, and PascalCase.",
        "detailed_desc": "Quickly reformat programming variables, document titles, or database field names. Convert between 8 standard naming conventions with one click.",
        "keywords": ["case converter", "camelcase", "snake_case", "kebab-case", "title case", "uppercase lowercase"],
        "client_powered": True
    },
    {
        "id": "lorem-ipsum",
        "slug": "lorem-ipsum",
        "title": "Lorem Ipsum & Mock Data Generator",
        "category": "content",
        "badge": "Mock",
        "icon": "📜",
        "short_desc": "Generate clean placeholder text by paragraphs, sentences, or word counts for design mockups.",
        "detailed_desc": "Generate custom dummy Latin text with HTML tag wrapping (`<p>`, `<li>`), custom paragraph lengths, and quick copy to clipboard.",
        "keywords": ["lorem ipsum generator", "dummy text", "placeholder text", "mock copy", "latin generator"],
        "client_powered": True
    },

    # --- Calculators & Units ---
    {
        "id": "css-generator",
        "slug": "css-generator",
        "title": "CSS Gradient & Box Shadow Studio",
        "category": "converters",
        "badge": "Visual CSS",
        "icon": "🎨",
        "short_desc": "Design smooth CSS linear/radial gradients and multi-layer box shadows with live preview and ready code.",
        "detailed_desc": "Visual CSS generator with sliders for angle, color stops, blur, spread, offset, and inset. Copy clean, vendor-prefix-free CSS rules.",
        "keywords": ["css gradient generator", "box shadow generator", "css studio", "gradient maker", "box shadow tool"],
        "client_powered": True
    },
    {
        "id": "unit-converter",
        "slug": "unit-converter",
        "title": "Byte, Data Storage & Speed Converter",
        "category": "converters",
        "badge": "Data Units",
        "icon": "💾",
        "short_desc": "Convert data storage units (Bytes, KB, MB, GB, TB, PB, KiB, MiB, GiB) and network bandwidth speeds (Kbps, Mbps, Gbps).",
        "detailed_desc": "Accurate unit conversion between Decimal (base-10: 1000) and Binary (base-2: 1024) storage metrics, plus bandwidth download time estimators.",
        "keywords": ["unit converter", "byte converter", "mb to gb", "storage converter", "network speed converter", "bandwidth calculator"],
        "client_powered": True
    }
]

def get_tool_by_slug(slug):
    """Retrieve a tool dictionary by its slug or ID."""
    for tool in TOOLS:
        if tool["slug"] == slug or tool["id"] == slug:
            return tool
    return None

def get_tools_by_category(category_id):
    """Filter tools by category."""
    if category_id == "all" or not category_id:
        return TOOLS
    return [t for t in TOOLS if t["category"] == category_id]
