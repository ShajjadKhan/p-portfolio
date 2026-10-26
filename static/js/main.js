/**
 * Shajjad Khan — Official Portfolio JavaScript
 * Domain: www.shajjadkhan.com
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Navigation Drawer & Toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    const mobileMenuQuery = window.matchMedia('(max-width: 860px)');
    const backgroundForInert = document.querySelectorAll('main, footer, .brand-logo');

    function setBackgroundInert(isInert) {
        backgroundForInert.forEach(el => {
            if (isInert) {
                el.setAttribute('inert', '');
                el.setAttribute('aria-hidden', 'true');
            } else {
                el.removeAttribute('inert');
                el.removeAttribute('aria-hidden');
            }
        });
    }

    function getDrawerFocusable() {
        if (!navLinks) return [];
        return Array.from(
            navLinks.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
        ).filter(el => el.getClientRects().length > 0);
    }

    function openMobileMenu() {
        if (!navLinks || !mobileMenuToggle) return;
        navLinks.classList.add('active');
        mobileMenuToggle.classList.add('open');
        mobileMenuToggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        setBackgroundInert(true);
        const focusable = getDrawerFocusable();
        if (focusable.length) {
            focusable[0].focus();
        }
    }

    function closeMobileMenu({ restoreFocus = true } = {}) {
        if (!navLinks || !mobileMenuToggle) return;
        const wasOpen = navLinks.classList.contains('active');
        navLinks.classList.remove('active');
        mobileMenuToggle.classList.remove('open');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        setBackgroundInert(false);
        if (wasOpen && restoreFocus) {
            mobileMenuToggle.focus();
        }
    }

    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (navLinks.classList.contains('active')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        // Close mobile menu when a nav link or drawer button is clicked
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                closeMobileMenu();
            });
        });

        // Keep keyboard focus inside the open drawer and close on Escape
        document.addEventListener('keydown', (e) => {
            if (!navLinks.classList.contains('active')) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                closeMobileMenu();
                return;
            }

            if (e.key !== 'Tab') return;

            const focusable = getDrawerFocusable();
            if (!focusable.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (!navLinks.contains(document.activeElement)) {
                e.preventDefault();
                first.focus();
                return;
            }

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('active') && !navLinks.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                closeMobileMenu();
            }
        });

        // Reset the drawer if the viewport grows past the mobile breakpoint
        mobileMenuQuery.addEventListener('change', (e) => {
            if (!e.matches) {
                closeMobileMenu({ restoreFocus: false });
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
    const formFields = document.getElementById('form-fields');
    const formSuccess = document.getElementById('form-success');
    const formResetBtn = document.getElementById('form-reset-btn');
    const submitBtn = document.getElementById('contact-submit-btn');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('contact-name').value.trim();
            const email = document.getElementById('contact-email').value.trim();
            const company = document.getElementById('contact-company').value.trim();
            const phone = document.getElementById('contact-phone').value.trim();
            const projectType = document.getElementById('contact-project-type').value;
            const message = document.getElementById('contact-message').value.trim();
            const website = document.getElementById('contact-website').value.trim();

            if (!name || !email || !message) {
                showAlert('Please fill in all required fields (Name, Email, Message).', 'error');
                return;
            }

            // Set loading state
            submitBtn.disabled = true;
            const originalBtnHtml = submitBtn.innerHTML;
            submitBtn.innerHTML = '<svg class="bi-icon spin" aria-hidden="true" focusable="false"><use href="#bi-arrow-repeat"></use></svg> <span>Sending Message...</span>';

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
                        phone: phone,
                        project_type: projectType,
                        message: message,
                        website: website
                    })
                });

                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    contactForm.reset();
                    formAlert.classList.add('d-none');
                    formFields.classList.add('d-none');
                    formSuccess.classList.remove('d-none');
                    formSuccess.focus();
                    trackEvent('contact_submit', { project_type: projectType, has_company: Boolean(company), has_phone: Boolean(phone) });
                } else {
                    showAlert(result.message || 'Error sending inquiry. Please try again.', 'error');
                }
            } catch (err) {
                showAlert('Network error. Please try again, or email directly.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
            }
        });
    }

    if (formResetBtn) {
        formResetBtn.addEventListener('click', () => {
            contactForm.reset();
            formSuccess.classList.add('d-none');
            formFields.classList.remove('d-none');
            document.getElementById('contact-name').focus();
        });
    }

    const copyEmailBtn = document.getElementById('copy-email-btn');
    if (copyEmailBtn) {
        copyEmailBtn.addEventListener('click', copyPortfolioEmail);
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



    // 5. Live Riyadh clock. Saudi Arabia uses Arabia Standard Time (UTC+3).
    function updateLiveClock() {
        const now = new Date();
        const timeParts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Riyadh',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(now);
        const time = timeParts
            .filter(part => part.type === 'hour' || part.type === 'minute')
            .map(part => part.value)
            .join(':');
        const clockEl = document.getElementById('portfolio-live-clock');
        if (clockEl) {
            clockEl.textContent = `Active in Riyadh • ${time} AST`;
        }
    }
    updateLiveClock();
    setInterval(updateLiveClock, 30000);

    // 6. Interactive TawreedFlow Specs Switcher (Parity with shajjadkhan.com)
    const specBtns = document.querySelectorAll('.spec-tab-btn');
    const specDetailBox = document.getElementById('spec-detail-box');
    const specsData = {
        overview: "Centralizes purchase requisitions, multi-tier approval matrices (Chef → Purchasing → GM/Finance), and automated vendor dispatching to streamline hotel engineering and operational procurement across the Gulf region.",
        architecture: "Engineered on Python / Django 6.0 with strict multi-tenant schemas, Redis caching, Celery async dispatch workers, and MariaDB/PostgreSQL transaction isolation.",
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

    // 7. Engagement CTAs: Auto-select Project Type & focus contact form
    const engagementCtas = document.querySelectorAll('.engagement-cta');
    const projectTypeSelect = document.getElementById('contact-project-type');
    const nameInput = document.getElementById('contact-name');

    engagementCtas.forEach(btn => {
        btn.addEventListener('click', () => {
            const desiredType = btn.getAttribute('data-project-type');
            if (desiredType && projectTypeSelect) {
                for (let i = 0; i < projectTypeSelect.options.length; i++) {
                    if (projectTypeSelect.options[i].value === desiredType) {
                        projectTypeSelect.selectedIndex = i;
                        break;
                    }
                }
            }
            if (nameInput) {
                setTimeout(() => {
                    nameInput.focus();
                }, 350);
            }
        });
    });

    // 8. Conversion Link Click Delegation
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        const href = link.getAttribute('href') || '';

        if (href.includes('tawreedflow.com')) {
            trackEvent('outbound_tawreedflow', href);
        } else if (href.includes('cal.com')) {
            trackEvent('booking_click', href);
        } else if (href.includes('wa.me')) {
            trackEvent('whatsapp_click', href);
        } else if (href === '/tools' || href.startsWith('/tools/')) {
            trackEvent('tools_launch', href);
        } else if (href.startsWith('/work/')) {
            trackEvent('case_study_click', href);
        } else if (href.startsWith('/writing/')) {
            trackEvent('writing_read', href);
        } else if (href.includes('github.com')) {
            trackEvent('github_click', href);
        } else if (href.includes('linkedin.com')) {
            trackEvent('linkedin_click', href);
        }
    });
});

// Privacy-first, cookieless event tracker (sendBeacon with fetch fallback)
function trackEvent(eventName, eventData) {
    if (!eventName) return;
    try {
        const payload = JSON.stringify({
            event_name: eventName,
            event_data: typeof eventData === 'object' ? JSON.stringify(eventData) : String(eventData || ''),
            path: window.location.pathname,
            referrer: document.referrer || ''
        });

        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon('/api/event', blob);
        } else {
            fetch('/api/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true
            }).catch(() => {});
        }
    } catch (e) {
        // Silent fail: never interrupt user interaction
    }
}
window.trackEvent = trackEvent;

// Global copy email helper
function copyPortfolioEmail() {
    const email = 'hello@shajjadkhan.com';
    trackEvent('email_copy', email);
    navigator.clipboard.writeText(email).then(() => {
        const btn = document.getElementById('copy-email-btn');
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '<svg class="bi-icon" aria-hidden="true" focusable="false"><use href="#bi-check2"></use></svg> <span>Copied hello@!</span>';
            btn.style.color = '#10b981';
            setTimeout(() => {
                btn.innerHTML = original;
                btn.style.color = '';
            }, 2500);
        }
    }).catch(() => {
        window.location.href = `mailto:${email}`;
    });
}
