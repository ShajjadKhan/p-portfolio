/**
 * tools-ui.js - Direct-Showing Instant Search, Pill Filtering & Command Palette
 * FastTrack Tools Platform
 */

document.addEventListener('DOMContentLoaded', () => {
    initDirectSearch();
    initCategoryPills();
    initCommandPalette();
    initMobileNav();
});

function initDirectSearch() {
    const searchInput = document.getElementById('main-search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    const toolsGrid = document.getElementById('toolsGrid');
    const emptyState = document.getElementById('emptyState');
    const searchCounter = document.getElementById('search-counter');
    
    if (!searchInput || !toolsGrid) return;

    const cards = Array.from(toolsGrid.querySelectorAll('.tool-card-direct:not(.ad-grid-card)'));
    const adCards = Array.from(toolsGrid.querySelectorAll('.ad-grid-card'));
    const totalCount = cards.length;

    function applyFilter() {
        const query = searchInput.value.trim().toLowerCase();
        const activePill = document.querySelector('.pill-btn.active');
        const activeCategory = activePill ? activePill.getAttribute('data-category') : 'all';

        if (clearBtn) {
            clearBtn.style.display = query ? 'flex' : 'none';
        }

        let visibleCount = 0;

        cards.forEach(card => {
            const category = card.getAttribute('data-category');
            const keywords = (card.getAttribute('data-keywords') || '').toLowerCase();
            const name = (card.querySelector('.tool-name')?.textContent || '').toLowerCase();
            const summary = (card.querySelector('.tool-summary')?.textContent || '').toLowerCase();

            const matchesCategory = (activeCategory === 'all' || category === activeCategory);
            const matchesQuery = !query || 
                name.includes(query) || 
                summary.includes(query) || 
                keywords.includes(query);

            if (matchesCategory && matchesQuery) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Hide in-grid ad cards during active search query or filtered categories to keep results ultra-focused
        adCards.forEach(adCard => {
            if (!query && activeCategory === 'all') {
                adCard.style.display = 'flex';
            } else {
                adCard.style.display = 'none';
            }
        });

        if (searchCounter) {
            searchCounter.textContent = query ? `${visibleCount} Found` : `${totalCount} Tools`;
        }

        if (emptyState) {
            emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
        }
    }

    searchInput.addEventListener('input', applyFilter);

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            applyFilter();
            searchInput.focus();
        });
    }

    // Handle hash in URL (e.g. /tools#pdf)
    if (window.location.hash) {
        const hashCat = window.location.hash.replace('#', '');
        const targetPill = document.querySelector(`.pill-btn[data-category="${hashCat}"]`);
        if (targetPill) {
            targetPill.click();
        }
    }
}

function initCategoryPills() {
    const pills = document.querySelectorAll('.pill-btn');
    const searchInput = document.getElementById('main-search-input');

    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            if (searchInput) {
                searchInput.dispatchEvent(new Event('input'));
            }
        });
    });
}

function resetSearch() {
    const searchInput = document.getElementById('main-search-input');
    const allPill = document.querySelector('.pill-btn[data-category="all"]');
    if (searchInput) {
        searchInput.value = '';
    }
    if (allPill) {
        allPill.click();
    }
}

// --- Command Palette (Cmd+K or /) ---
let cachedTools = null;

async function getCachedTools() {
    if (cachedTools) return cachedTools;
    try {
        const res = await fetch('/tools/api/list');
        const data = await res.json();
        cachedTools = data.tools || [];
        return cachedTools;
    } catch (e) {
        console.warn('Unable to load tools list API', e);
        return [];
    }
}

function toggleCommandPalette(show) {
    const modal = document.getElementById('command-modal');
    const input = document.getElementById('cmd-search-input');
    if (!modal) return;

    if (show) {
        modal.style.display = 'flex';
        getCachedTools().then(renderCmdResults);
        setTimeout(() => input && input.focus(), 60);
    } else {
        modal.style.display = 'none';
        if (input) input.value = '';
    }
}

function renderCmdResults() {
    const input = document.getElementById('cmd-search-input');
    const list = document.getElementById('cmd-results-list');
    if (!list || !cachedTools) return;

    const query = (input?.value || '').trim().toLowerCase();
    const filtered = cachedTools.filter(t => {
        if (!query) return true;
        return t.title.toLowerCase().includes(query) ||
               t.short_desc.toLowerCase().includes(query) ||
               (t.keywords && t.keywords.some(k => k.toLowerCase().includes(query)));
    });

    list.innerHTML = filtered.slice(0, 8).map((t, idx) => `
        <a href="/tools/${t.slug}" class="cmd-item ${idx === 0 ? 'active' : ''}">
            <span class="cmd-item-icon">${t.icon}</span>
            <div class="cmd-item-info">
                <div class="cmd-item-title">${t.title}</div>
                <div class="cmd-item-desc">${t.short_desc}</div>
            </div>
            <span class="cmd-item-cat">${t.category.toUpperCase()}</span>
        </a>
    `).join('') || '<div style="padding: 1.5rem; text-align: center; color: var(--text-dim);">No matching tools found</div>';
}

function initCommandPalette() {
    const input = document.getElementById('cmd-search-input');
    if (input) {
        input.addEventListener('input', renderCmdResults);
    }

    document.addEventListener('keydown', (e) => {
        if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) && 
            document.activeElement.tagName !== 'INPUT' && 
            document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            const mainSearch = document.getElementById('main-search-input');
            if (mainSearch) {
                mainSearch.focus();
                mainSearch.select();
            } else {
                toggleCommandPalette(true);
            }
        } else if (e.key === 'Escape') {
            toggleCommandPalette(false);
        }
    });
}

function initMobileNav() {
    const btn = document.getElementById('mobileMenuBtn');
    const nav = document.querySelector('.nav-links');
    if (!btn || !nav) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = nav.style.display === 'flex';
        nav.style.display = isOpen ? 'none' : 'flex';
        nav.style.flexDirection = 'column';
        nav.style.position = 'absolute';
        nav.style.top = '100%';
        nav.style.left = '0';
        nav.style.right = '0';
        nav.style.background = '#0a0f1d';
        nav.style.padding = '1.25rem';
        nav.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    });

    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target) && !btn.contains(e.target) && window.innerWidth <= 768) {
            nav.style.display = 'none';
        }
    });
}

window.dismissStickyAd = function() {
    const el = document.getElementById('stickyAnchorAd');
    if (el) {
        el.style.transform = 'translateY(120%)';
        setTimeout(() => {
            el.style.display = 'none';
        }, 250);
    }
};
