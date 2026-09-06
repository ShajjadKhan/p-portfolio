/**
 * Shajjad Khan — Official Portfolio JavaScript
 * Domain: www.shajjadkhan.com | Port: 9191
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Navigation Toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');

    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = navLinks.classList.toggle('active');
            mobileMenuToggle.classList.toggle('open', isOpen);
        });

        // Close mobile menu when a nav link or drawer button is clicked
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                mobileMenuToggle.classList.remove('open');
            });
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                navLinks.classList.remove('active');
                mobileMenuToggle.classList.remove('open');
            }
        });
    }

    // 2. Navbar Background Blur on Scroll
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            navbar.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.4)';
            navbar.style.borderBottomColor = 'rgba(255, 255, 255, 0.12)';
        } else {
            navbar.style.boxShadow = 'none';
            navbar.style.borderBottomColor = 'rgba(255, 255, 255, 0.08)';
        }
    });

    // 3. Contact Form AJAX Submission
    const contactForm = document.getElementById('contact-form');
    const formAlert = document.getElementById('form-alert');
    const submitBtn = document.getElementById('contact-submit-btn');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('contact-name').value.trim();
            const email = document.getElementById('contact-email').value.trim();
            const company = document.getElementById('contact-company').value.trim();
            const projectType = document.getElementById('contact-project-type').value;
            const message = document.getElementById('contact-message').value.trim();

            if (!name || !email || !message) {
                showAlert('Please fill in all required fields (Name, Email, Message).', 'error');
                return;
            }

            // Set loading state
            submitBtn.disabled = true;
            const originalBtnHtml = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> <span>Transmitting Message...</span>';

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        company: company,
                        project_type: projectType,
                        message: message
                    })
                });

                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    showAlert(result.message || 'Inquiry transmitted successfully!', 'success');
                    contactForm.reset();
                } else {
                    showAlert(result.message || 'Error transmitting inquiry. Please try again.', 'error');
                }
            } catch (err) {
                showAlert('Network error communicating with portfolio daemon. Please try again later or email directly.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
            }
        });
    }

    function showAlert(msg, type) {
        if (!formAlert) return;
        formAlert.textContent = msg;
        formAlert.className = `alert-box alert-${type}`;
        formAlert.classList.remove('d-none');
        
        if (type === 'success') {
            setTimeout(() => {
                formAlert.classList.add('d-none');
            }, 8000);
        }
    }

    // 4. Portfolio Tools Search & Category Filter
    const toolsSearch = document.getElementById('portfolio-tools-search');
    const toolsGrid = document.getElementById('portfolioToolsGrid');
    const toolsEmpty = document.getElementById('portfolioToolsEmpty');
    const toolsCounter = document.getElementById('portfolio-tools-counter');
    const catPills = document.querySelectorAll('.p-pill-btn');

    if (toolsSearch && toolsGrid) {
        const cards = Array.from(toolsGrid.querySelectorAll('.p-tool-card'));
        const totalTools = cards.length;

        function filterPortfolioTools() {
            const query = toolsSearch.value.trim().toLowerCase();
            const activePill = document.querySelector('.p-pill-btn.active');
            const selectedCat = activePill ? activePill.getAttribute('data-cat') : 'all';

            let matchCount = 0;

            cards.forEach(card => {
                const cardCat = card.getAttribute('data-category');
                const cardKeywords = (card.getAttribute('data-keywords') || '').toLowerCase();
                const cardTitle = (card.querySelector('.p-tool-title')?.textContent || '').toLowerCase();
                const cardDesc = (card.querySelector('.p-tool-desc')?.textContent || '').toLowerCase();

                const matchesCat = (selectedCat === 'all' || cardCat === selectedCat);
                const matchesQuery = !query ||
                    cardTitle.includes(query) ||
                    cardDesc.includes(query) ||
                    cardKeywords.includes(query);

                if (matchesCat && matchesQuery) {
                    card.style.display = 'flex';
                    matchCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            if (toolsCounter) {
                toolsCounter.textContent = query || selectedCat !== 'all' ? `${matchCount} Found` : `${totalTools} Utilities Ready`;
            }

            if (toolsEmpty) {
                toolsEmpty.style.display = matchCount === 0 ? 'block' : 'none';
            }
        }

        toolsSearch.addEventListener('input', filterPortfolioTools);

        catPills.forEach(pill => {
            pill.addEventListener('click', () => {
                catPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                filterPortfolioTools();
            });
        });
    }

    // 5. Live Riyadh / UTC Clock (Parity with shajjadkhan.com)
    function updateLiveClock() {
        const now = new Date();
        const utcHours = String(now.getUTCHours()).padStart(2, '0');
        const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
        const clockEl = document.getElementById('portfolio-live-clock');
        if (clockEl) {
            clockEl.textContent = `Active in Riyadh • ${utcHours}:${utcMinutes} UTC`;
        }
    }
    updateLiveClock();
    setInterval(updateLiveClock, 30000);

    // 6. Interactive TawreedFlow Specs Switcher (Parity with shajjadkhan.com)
    const specBtns = document.querySelectorAll('.spec-tab-btn');
    const specDetailBox = document.getElementById('spec-detail-box');
    const specsData = {
        overview: "Centralizes purchase requisitions, multi-tier approval matrices (Chef → Purchasing → GM/Finance), and automated vendor dispatching to streamline hotel engineering and operational procurement across the Gulf region.",
        architecture: "Engineered on Python / Django 6.0 with strict multi-tenant schemas, Redis caching, Celery async dispatch daemons, and MariaDB/PostgreSQL transaction isolation.",
        impact: "Eliminating multi-day requisition delays and procurement leakage across GCC luxury hotels, automating delivery reconciliation and invoice audit trails."
    };

    if (specBtns.length && specDetailBox) {
        specBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                specBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const key = btn.getAttribute('data-spec');
                if (specsData[key]) {
                    specDetailBox.textContent = specsData[key];
                }
            });
        });
    }
});

// Global copy email helper
function copyPortfolioEmail() {
    const email = 'shajjadkhan.me@hotmail.com';
    navigator.clipboard.writeText(email).then(() => {
        const btn = document.getElementById('copy-email-btn');
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="bi bi-check2"></i> <span>Copied!</span>';
            btn.style.color = '#10b981';
            setTimeout(() => {
                btn.innerHTML = original;
                btn.style.color = '';
            }, 2500);
        }
    });
}

