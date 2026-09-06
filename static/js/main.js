/**
 * Shajjad Khan — Official Portfolio JavaScript
 * Domain: www.shajjadkhan.com | Port: 9191
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Navigation Toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    const menuIcon = document.getElementById('menu-icon');

    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('active');
            menuIcon.className = isOpen ? 'bi bi-x-lg' : 'bi bi-list';
        });

        // Close mobile menu when a nav link is clicked
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                if (menuIcon) menuIcon.className = 'bi bi-list';
            });
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
});
