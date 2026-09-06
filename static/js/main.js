/**
 * Shajjad Khan — Official Portfolio JavaScript
 * Domain: www.shajjadkhan.com | Port: 9191
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Navigation Drawer & Toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');

    function closeMobileMenu() {
        if (navLinks && mobileMenuToggle) {
            navLinks.classList.remove('active');
            mobileMenuToggle.classList.remove('open');
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }
    }

    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = navLinks.classList.toggle('active');
            mobileMenuToggle.classList.toggle('open', isOpen);
            mobileMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        // Close mobile menu when a nav link or drawer button is clicked
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                closeMobileMenu();
            });
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeMobileMenu();
            }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('active') && !navLinks.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                closeMobileMenu();
            }
        });
    }

    // 2. Navbar Elevation on Scroll & Active Section Scroll Spy
    const navbar = document.getElementById('navbar');
    const sections = document.querySelectorAll('section[id]');
    const navLinkEls = document.querySelectorAll('.nav-links .nav-link');

    function updateNavbarOnScroll() {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        // Toggle glass shadow
        if (navbar) {
            if (scrollY > 20) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }

        // Active Section Scroll Spy
        let currentSectionId = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            const sectionHeight = section.offsetHeight;
            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

        if (currentSectionId) {
            navLinkEls.forEach(link => {
                if (link.getAttribute('href') === `#${currentSectionId}`) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }
    }

    window.addEventListener('scroll', updateNavbarOnScroll, { passive: true });
    updateNavbarOnScroll();

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

