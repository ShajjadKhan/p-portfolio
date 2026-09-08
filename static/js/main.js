/**
 * Shajjad Khan — Official Portfolio JavaScript
 * Domain: www.shajjadkhan.com
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


    // 7. Playable tech chips across the landing page
    initPlayableTechChips();
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



function initPlayableTechChips() {
    const field = document.getElementById('playful-tech-field');
    if (!field || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const chips = Array.from(field.querySelectorAll('.play-chip'));
    const state = new Map();
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    function placeChip(chip, index) {
        const rect = chip.getBoundingClientRect();
        const left = parseFloat(getComputedStyle(chip).left || '0') || (40 + index * 42);
        const top = parseFloat(getComputedStyle(chip).top || '0') || (90 + index * 38);
        const x = clamp(left, 8, window.innerWidth - rect.width - 8);
        const y = clamp(top, 82, window.innerHeight - rect.height - 18);
        const item = { x, y, vx: 0, vy: 0, rot: (index % 2 ? -4 : 4), dragging: false };
        state.set(chip, item);
        chip.style.left = '0px';
        chip.style.top = '0px';
        chip.style.right = 'auto';
        setChipTransform(chip, item);
    }

    function setChipTransform(chip, item) {
        chip.style.setProperty('--chip-x', `${item.x}px`);
        chip.style.setProperty('--chip-y', `${item.y}px`);
        chip.style.setProperty('--chip-rot', `${item.rot}deg`);
        chip.style.transform = `translate3d(${item.x}px, ${item.y}px, 0) rotate(${item.rot}deg)`;
    }

    chips.forEach(placeChip);

    chips.forEach(chip => {
        chip.addEventListener('pointerdown', event => {
            const item = state.get(chip);
            if (!item) return;
            chip.setPointerCapture(event.pointerId);
            item.dragging = true;
            item.grabX = event.clientX - item.x;
            item.grabY = event.clientY - item.y;
            item.lastX = event.clientX;
            item.lastY = event.clientY;
            item.lastT = performance.now();
            chip.classList.add('is-dragging');
        });

        chip.addEventListener('pointermove', event => {
            const item = state.get(chip);
            if (!item || !item.dragging) return;
            const now = performance.now();
            const dt = Math.max(16, now - item.lastT);
            const nextX = clamp(event.clientX - item.grabX, 8, window.innerWidth - chip.offsetWidth - 8);
            const nextY = clamp(event.clientY - item.grabY, 82, window.innerHeight - chip.offsetHeight - 18);
            item.vx = (event.clientX - item.lastX) / dt * 16;
            item.vy = (event.clientY - item.lastY) / dt * 16;
            item.x = nextX;
            item.y = nextY;
            item.rot = clamp(item.vx * 1.6, -18, 18);
            item.lastX = event.clientX;
            item.lastY = event.clientY;
            item.lastT = now;
            setChipTransform(chip, item);
        });

        function release() {
            const item = state.get(chip);
            if (!item || !item.dragging) return;
            item.dragging = false;
            item.vy = Math.max(item.vy + 9, 11);
            chip.classList.remove('is-dragging');
            chip.classList.add('is-dropped');
            setTimeout(() => chip.classList.remove('is-dropped'), 760);
        }
        chip.addEventListener('pointerup', release);
        chip.addEventListener('pointercancel', release);

        chip.addEventListener('click', () => {
            const item = state.get(chip);
            if (!item || item.dragging) return;
            item.vx += (Math.random() - 0.5) * 8;
            item.vy += 14 + Math.random() * 6;
            item.rot += (Math.random() - 0.5) * 22;
            chip.classList.add('is-dropped');
            setTimeout(() => chip.classList.remove('is-dropped'), 760);
        });
    });

    function physics() {
        chips.forEach(chip => {
            const item = state.get(chip);
            if (!item || item.dragging) return;
            const maxX = window.innerWidth - chip.offsetWidth - 8;
            const maxY = window.innerHeight - chip.offsetHeight - 18;
            item.vy += 0.28;
            item.x += item.vx;
            item.y += item.vy;
            item.vx *= 0.985;
            item.vy *= 0.992;
            if (item.x < 8 || item.x > maxX) {
                item.x = clamp(item.x, 8, maxX);
                item.vx *= -0.62;
            }
            if (item.y > maxY) {
                item.y = maxY;
                item.vy *= -0.46;
                item.vx *= 0.82;
                if (Math.abs(item.vy) < 0.85) item.vy = 0;
            }
            if (item.y < 82) {
                item.y = 82;
                item.vy *= -0.45;
            }
            item.rot = clamp(item.rot + item.vx * 0.08, -22, 22);
            setChipTransform(chip, item);
        });
        requestAnimationFrame(physics);
    }
    requestAnimationFrame(physics);

    window.addEventListener('resize', () => {
        chips.forEach(chip => {
            const item = state.get(chip);
            if (!item) return;
            item.x = clamp(item.x, 8, window.innerWidth - chip.offsetWidth - 8);
            item.y = clamp(item.y, 82, window.innerHeight - chip.offsetHeight - 18);
            setChipTransform(chip, item);
        });
    });
}
