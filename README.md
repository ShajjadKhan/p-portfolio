# Shajjad Khan — Official Portfolio Website

> Official source code for **[www.shajjadkhan.com](https://www.shajjadkhan.com/)**

Professional portfolio of **Shajjad Khan** — Founder and Systems Architect. Showcasing flagship B2B enterprise procurement SaaS **[TawreedFlow](https://tawreedflow.com/)**, decentralized spatial knowledge graphs **BlockTree**, and carrier-grade telecom / network automation infrastructure.

---

## 🚀 Showcased Ventures & Systems

1. **[TawreedFlow (توريد)](https://tawreedflow.com/)**
   - Enterprise B2B multi-tenant procurement & supply chain SaaS purpose-built for GCC luxury hotels and hospitality (Saudi Arabia, UAE, Qatar).
   - Replaces un-audited WhatsApp purchasing with end-to-end requisitions, multi-level approvals, automated RFQs, quotation comparison with substitute item flags, PO issuance, and WhatsApp / WebPush dispatch.
   - Live production across GCC luxury hotels and regional procurement operations.
   - Stack: Python / Django 6.0, PostgreSQL/MySQL, Celery, Redis, VAPID WebPush, WhatsApp Cloud API, Linux.

2. **BlockTree Spatial Matrix**
   - Real-time 2D spatial newsletter and branching discourse hypergraph. 360° virtual joystick physics, verified author registration, and Microsoft Word typography studio.
   - Stack: Python, Flask, SQLite WAL, HTML5 Canvas, Panzoom.

3. **ISP Telecom Billing & MikroTik Automation**
   - High-throughput billing engine, dynamic bandwidth queue shaping via MikroTik RouterOS API, automated WhatsApp invoice reminders, and captive portal hotspot redirects.
   - Stack: Python, PHP, MySQL, MikroTik API, FreeRADIUS, CWMP TR-069.

4. **Enterprise HR & Automated Payroll SaaS**
   - Multi-branch human resource management system with biometric attendance synchronization, hierarchical leave workflows, and automated payroll pay slip generation.
   - Stack: Python, Django, PostgreSQL, TailwindCSS.

---

## 🛠️ Tech Stack & Infrastructure

- **Backend**: Python 3.12, Flask, SQLite3 (inquiries store)
- **Frontend**: Semantic HTML5, Modern CSS3 (Grid & Flexbox), Vanilla JavaScript (ES6+)
- **Typography**: Space Grotesk, Inter, JetBrains Mono
- **Deployment**: Gunicorn daemon on port `9191` reverse-proxied behind Nginx on production (`shajjadkhan.com`)
- **Domain**: `www.shajjadkhan.com`

---

## 📦 Quick Start & Local Run

```bash
# 1. Clone the repository
git clone git@github.com:ShajjadKhan/p-portfolio.git
cd p-portfolio

# 2. Set up virtual environment
python3 -m venv venv
source venv/bin/activate
pip install flask

# 3. Launch server on port 9191
PORT=9191 python app.py
```

Visit: `http://localhost:9191`

---

## 📄 License & Ownership
Copyright © 2026 Shajjad Khan. All rights reserved.
Registered domain: [www.shajjadkhan.com](https://www.shajjadkhan.com/)
