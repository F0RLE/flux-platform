let translations = {};
let currentLang = 'en';
window.currentLang = currentLang; // Expose to window for other modules
let langModalShown = false;

async function getSystemLanguage() {
    try {
        const res = await fetch('/api/system_language');
        const data = await res.json();
        return data.language || 'en';
    } catch (e) {
        console.error("Failed to get system language:", e);
        return 'en';
    }
}
window.getSystemLanguage = getSystemLanguage;

async function loadTranslations(lang = null) {
    try {
        const langToLoad = lang || currentLang;

        // Native Tauri path if available
        if (window.__TAURI__) {
            try {
                translations = await window.__TAURI__.core.invoke('get_translations', { lang: langToLoad });
            } catch (e) {
                console.error("Native translation load failed", e);
                // Fallback?
            }
        } else {
            // Browser/Bridge path
            const res = await fetch(`/api/translations?lang=${langToLoad}`);
            if (!res.ok) {
                console.warn(`Translation fetch failed: ${res.status}`);
                if (langToLoad === 'ru') {
                    translations = { "ui.launcher.button.cancel": "Отмена", "ui.launcher.button.close": "Закрыть" };
                }
            } else {
                const text = await res.text();
                try {
                    translations = JSON.parse(text);
                } catch (e) {
                    console.error("Failed to parse translations JSON:", text.substring(0, 50));
                }
            }
        }

        currentLang = langToLoad;

        if (lang) {
            // Save to localStorage
            localStorage.setItem('web_launcher_language', lang);

            // Update Backend Settings
            if (window.__TAURI__) {
                try {
                    await window.__TAURI__.core.invoke('save_setting', { key: 'LANGUAGE', value: lang });
                    await window.__TAURI__.core.invoke('save_setting', { key: 'BOT_LANGUAGE', value: '' });
                } catch (e) { console.error("Native settings save failed", e); }
            } else {
                try {
                    await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key: 'LANGUAGE', value: lang })
                    });
                    await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key: 'BOT_LANGUAGE', value: '' })
                    });
                } catch (e) {
                    console.error("Failed to save language setting:", e);
                }
            }
        }

        applyTranslations();
        initEmojiFlags();
        updateLangButtons();
        if (typeof updateCurrentLangFlag === 'function') {
            updateCurrentLangFlag();
        }
    } catch (e) {
        console.error("Failed to load translations:", e);
        showToast(t('ui.launcher.web.failed_load_translations', 'Failed to load translations'), 'error');
    }
}
window.loadTranslations = loadTranslations;

// Language Switcher Logic
const langFlagClasses = { en: 'flag-gb', ru: 'flag-ru', zh: 'flag-cn' };

// Toggle sliding menu
window.toggleLangMenu = function () {
    const menu = document.getElementById('lang-menu-items');
    if (menu) {
        menu.classList.toggle('open');
    }
};

window.toggleSidebarLangMenu = function () {
    const menu = document.getElementById('sidebar-lang-menu');
    if (menu) {
        menu.classList.toggle('open');
    }
};

// Close menu when clicking outside
document.addEventListener('click', function (e) {
    // Top bar switcher
    const root = document.querySelector('.lang-switcher-root');
    const menu = document.getElementById('lang-menu-items');
    if (menu && menu.classList.contains('open') && root && !root.contains(e.target)) {
        menu.classList.remove('open');
    }

    // Sidebar switcher
    const sidebarRoot = document.querySelector('.sidebar-lang-switcher');
    const sidebarMenu = document.getElementById('sidebar-lang-menu');
    if (sidebarMenu && sidebarMenu.classList.contains('open') && sidebarRoot && !sidebarRoot.contains(e.target)) {
        sidebarMenu.classList.remove('open');
    }
});

// Update UI based on current language
function updateLangSwitcherUI() {
    // Update Current Language Button Icon
    const triggerBtn = document.getElementById('current-lang-trigger');
    if (triggerBtn) {
        // Clear existing icon
        triggerBtn.innerHTML = '';

        // Create new flag span
        const span = document.createElement('span');
        span.className = `flag-icon ${langFlagClasses[currentLang] || 'flag-gb'}`;
        triggerBtn.appendChild(span);
    }

    // Highlight active in menu (optional, or just show others?)
    // For now, let's just make sure the active one is styled if desired,
    // but main requirement is "flags next to flags" in the menu.
    // Hide current language in menu, show others
    document.querySelectorAll('.lang-menu-items .lang-btn').forEach(btn => {
        const lang = btn.getAttribute('data-lang');
        if (lang === currentLang) {
            btn.style.display = 'none';
        } else {
            btn.style.display = 'flex';
            btn.style.opacity = '1';
        }
    });
}

window.setLanguage = async function (lang) {
    // Optimistic UI update
    currentLang = lang;
    updateLangSwitcherUI();

    // Close menu after selection
    const menu = document.getElementById('lang-menu-items');
    if (menu) menu.classList.remove('open');

    await loadTranslations(lang);
}

// Update current flag on page load and language change
window.updateCurrentLangFlag = function () {
    updateLangSwitcherUI();
}

// Deprecated functions (noop)
window.toggleLangDropdown = function () { };
window.updateLangButtons = function () { updateLangSwitcherUI(); };

function t(key, defaultText = '') {
    return translations[key] || defaultText || key;
}
window.t = t;

function applyTranslations() {
    // Note: We don't need to store flags here because we restore them using String.fromCodePoint
    // which ensures consistent emoji display regardless of what was there before

    document.querySelectorAll('[data-i18n]').forEach(el => {
        // Skip language option buttons - they should keep their emoji flags
        if (el.classList.contains('lang-option') || el.classList.contains('lang-dropdown-btn')) {
            return;
        }
        const key = el.getAttribute('data-i18n');
        const text = t(key, el.textContent);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            if (el.type === 'password' || el.type === 'text') {
                // Only update placeholder, not value
                if (!el.value || el.value === el.getAttribute('data-original-value')) {
                    el.placeholder = text;
                }
            } else {
                el.placeholder = text;
            }
        } else if (el.tagName === 'OPTION') {
            // Don't change option text if it's already set
            if (!el.hasAttribute('data-i18n-set')) {
                el.textContent = text;
                el.setAttribute('data-i18n-set', 'true');
            }
        } else {
            // For text content, preserve structure but update text
            // Check if this element has children with data-i18n (they will be processed separately)
            const i18nChild = el.querySelector('[data-i18n]');
            if (i18nChild && i18nChild !== el) {
                // This element has a child with data-i18n, skip it (child will be processed)
                return;
            }

            // This element itself has data-i18n, update its text
            if (el.children.length === 0 || el.querySelector('svg')) {
                // If it's a simple text element or has only SVG icon, update text
                const svg = el.querySelector('svg');
                if (svg) {
                    // Preserve SVG, update text after it
                    const textNode = Array.from(el.childNodes).find(n => n.nodeType === 3);
                    if (textNode) {
                        textNode.textContent = ' ' + text;
                    } else {
                        el.appendChild(document.createTextNode(' ' + text));
                    }
                } else {
                    el.textContent = text;
                }
            } else {
                // Complex element, try to update only text nodes
                const textNodes = Array.from(el.childNodes).filter(n => n.nodeType === 3);
                if (textNodes.length > 0) {
                    // Update first text node, remove others
                    textNodes[0].textContent = text;
                    textNodes.slice(1).forEach(n => n.remove());
                } else {
                    // No text nodes, replace all content
                    el.textContent = text;
                }
            }
        }
    });

    // Apply placeholders with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key, el.placeholder);
    });

    // Apply titles (tooltips) with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = t(key, el.title);
    });

    // Keep language button state in sync (flags are SVG, not emoji)
    updateLangButtons();
}
window.applyTranslations = applyTranslations;

function updateLangButtonsHelper() {
    // Helper for legacy support if needed, but main logic is in updateLangSwitcherUI
}

function initEmojiFlags() {
    // Backward-compat: older code calls this; our flags are SVG so we just sync state.
    updateLangButtons();
}
window.initEmojiFlags = initEmojiFlags;
