/**
 * Hotel Procurement ROI & Savings Calculator Engine
 * TawreedFlow Enterprise / Shajjad Khan Portfolio
 */

(function () {
    'use strict';

    // DOM Elements
    const currencySelect = document.getElementById('calc-currency');
    const propertiesSlider = document.getElementById('calc-properties');
    const propertiesDisplay = document.getElementById('calc-properties-display');
    const spendSlider = document.getElementById('calc-spend');
    const spendDisplay = document.getElementById('calc-spend-display');
    const radioLabels = document.querySelectorAll('.calc-radio-label');
    const radioInputs = document.querySelectorAll('.calc-radio-input');

    // Result Displays
    const heroSavingsDisplay = document.getElementById('calc-total-savings');
    const rogueSavingsDisplay = document.getElementById('calc-rogue-savings');
    const laborSavingsDisplay = document.getElementById('calc-labor-savings');
    const volumeSavingsDisplay = document.getElementById('calc-volume-savings');
    const hoursSavedDisplay = document.getElementById('calc-hours-saved');

    // Lead Form
    const leadForm = document.getElementById('calc-lead-form');
    const leadStatus = document.getElementById('calc-lead-status');

    if (!propertiesSlider || !spendSlider) return;

    let currentMode = 'manual';

    // Format currency amount
    function formatMoney(amount, currency) {
        const rounded = Math.round(amount);
        return currency + ' ' + rounded.toLocaleString();
    }

    // Main calculation function
    function calculateROI() {
        const currency = currencySelect.value;
        const properties = parseInt(propertiesSlider.value, 10);
        const monthlySpend = parseInt(spendSlider.value, 10);
        const annualSpend = properties * monthlySpend * 12;

        // Rate factors based on operational baseline
        const isManual = (currentMode === 'manual');
        const rogueRate = isManual ? 0.065 : 0.035;       // 6.5% vs 3.5%
        const quoteNormRate = isManual ? 0.025 : 0.015;   // 2.5% vs 1.5%
        const adminLaborPerProp = isManual ? 24000 : 12000; // Annual labor savings in local currency units

        const rogueSavings = annualSpend * rogueRate;
        const quoteSavings = annualSpend * quoteNormRate;
        const laborSavings = properties * adminLaborPerProp;

        const totalAnnualSavings = rogueSavings + quoteSavings + laborSavings;
        const monthlyHours = properties * (isManual ? 46 : 22);

        // Update UI
        propertiesDisplay.textContent = properties + (properties === 1 ? ' Property' : ' Properties');
        spendDisplay.textContent = formatMoney(monthlySpend, currency);

        heroSavingsDisplay.textContent = formatMoney(totalAnnualSavings, currency);
        rogueSavingsDisplay.textContent = formatMoney(rogueSavings, currency);
        laborSavingsDisplay.textContent = formatMoney(laborSavings, currency);
        volumeSavingsDisplay.textContent = formatMoney(quoteSavings, currency);
        hoursSavedDisplay.textContent = monthlyHours + ' hrs / mo';
    }

    // Event Listeners for Controls
    propertiesSlider.addEventListener('input', calculateROI);
    spendSlider.addEventListener('input', calculateROI);
    currencySelect.addEventListener('change', calculateROI);

    // Mode Radio Buttons
    radioInputs.forEach(input => {
        input.addEventListener('change', function () {
            radioLabels.forEach(l => l.classList.remove('active'));
            this.parentElement.classList.add('active');
            currentMode = this.value;
            calculateROI();
        });
    });

    // Lead Form Handler
    if (leadForm) {
        leadForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const submitBtn = leadForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;

            const name = document.getElementById('calc-lead-name').value.trim();
            const email = document.getElementById('calc-lead-email').value.trim();
            const hotel = document.getElementById('calc-lead-hotel').value.trim();
            const phone = document.getElementById('calc-lead-phone').value.trim();

            if (!name || !email) {
                leadStatus.className = 'calc-lead-status error';
                leadStatus.textContent = 'Please enter your name and email address.';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Generating Report...';

            const payload = {
                name: name,
                email: email,
                organization: hotel || 'Hospitality Group',
                phone: phone || '',
                service: 'TawreedFlow ROI Report',
                message: `[ROI CALCULATOR REPORT REQUEST]\n\nProperties: ${propertiesSlider.value}\nMonthly Spend: ${spendSlider.value} ${currencySelect.value}\nBaseline Mode: ${currentMode}\nCalculated Annual Savings: ${heroSavingsDisplay.textContent}\nHours Saved: ${hoursSavedDisplay.textContent}`
            };

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    leadStatus.className = 'calc-lead-status success';
                    leadStatus.textContent = '✓ Report request received! Shajjad will email your customized audit breakdown within 24 hours.';
                    leadForm.reset();
                    if (window.trackEvent) {
                        window.trackEvent('calculator_report_request', {
                            properties: propertiesSlider.value,
                            currency: currencySelect.value,
                            monthly_spend: spendSlider.value
                        });
                    }
                } else {
                    throw new Error('Server error');
                }
            } catch (err) {
                leadStatus.className = 'calc-lead-status error';
                leadStatus.textContent = 'Unable to send right now. Please email hello@shajjadkhan.com directly.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    // Initialize
    calculateROI();
})();
