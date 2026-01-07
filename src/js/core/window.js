// Window control functions for Tauri desktop application

// === BLOCK BROWSER BEHAVIOR IMMEDIATELY ===
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
}, true);

// Pause backend monitoring when out of focus/minimized
function updateMonitoringState() {
    // If hidden OR blurred, pause monitoring
    const shouldPause = document.hidden || !document.hasFocus();

    if (window.__TAURI__) {
        window.__TAURI__.core.invoke('set_monitoring_paused', { paused: shouldPause })
            .catch(e => console.error("Failed to set monitoring state:", e));
    }
}

document.addEventListener('visibilitychange', updateMonitoringState);
window.addEventListener('blur', updateMonitoringState);
window.addEventListener('focus', updateMonitoringState);
// Initial check
setTimeout(updateMonitoringState, 1000);

document.addEventListener('keydown', (e) => {
    // Block DevTools (F12, Ctrl+Shift+I/J/C)
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    // F11 - Toggle Maximize (Like the UI button)
    if (e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        console.log('[Window] F11 pressed, toggling maximize...');

        if (window.__TAURI__) {
            window.__TAURI__.core.invoke('maximize_window').catch(err => {
                console.error('[Window] Failed to toggle maximize on F11:', err);
            });
        } else if (typeof window.toggleMaximizeWindow === 'function') {
            window.toggleMaximizeWindow();
        }
        return false;
    }
    // Block Browser common shortcuts (Scroll lock, etc. handled by OS, but web-ones here)
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S' || e.key === 'f' || e.key === 'F' || e.key === 'g' || e.key === 'G')) {
        // Special case: Ctrl+R is allowed further down for reload
        if (e.key !== 'r' && e.key !== 'R') {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }
}, true);

// Zoom state
let currentZoom = 1.0;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

// Apply zoom using Tauri native WebView zoom
async function applyZoom(zoom) {
    currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    if (window.__TAURI__) {
        try {
            await window.__TAURI__.core.invoke('set_webview_zoom', { zoom: currentZoom });
        } catch (e) {
            console.error('Zoom error:', e);
        }
    }
    if (typeof showToast === 'function') {
        showToast(`Zoom: ${Math.round(currentZoom * 100)}%`, 'info', 800);
    }
}

// Load saved zoom on startup
document.addEventListener('DOMContentLoaded', async () => {
    if (window.__TAURI__) {
        try {
            currentZoom = await window.__TAURI__.core.invoke('get_webview_zoom');
        } catch (e) {}
    }
});


// Ctrl+Scroll for zoom
document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        applyZoom(currentZoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    }
}, { passive: false });

// Ctrl+R / F5 - Reload launcher
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К')) || e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        console.log('Reloading launcher...');
        location.reload();
        return false;
    }
});

let isClosing = false;
window.minimizeWindow = async function () {
    if (window.__TAURI__) {
        try {
            await window.__TAURI__.core.invoke('minimize_window');
        } catch (e) {
            console.error("Failed to minimize:", e);
        }
    } else if (window.electronAPI && window.electronAPI.minimize) {
        window.electronAPI.minimize();
    } else {
        console.log('Minimize window (Mock)');
    }
};

window.toggleMaximizeWindow = async function () {
    if (window.__TAURI__) {
        try {
            // Restore working logic: use backend to toggle state correctly
            await window.__TAURI__.core.invoke('maximize_window');
        } catch (e) {
            console.error("Failed to toggle maximize:", e);
        }
    } else if (window.electronAPI && window.electronAPI.toggleMaximize) {
        window.electronAPI.toggleMaximize();
    } else {
        console.log('Toggle maximize window (Mock)');
    }
};

// Update maximize icon based on window state (global function for Electron)
window.updateMaximizeIcon = function (isMaximized) {
    const maximizeIcon = document.getElementById('maximize-icon');
    if (!maximizeIcon) return;

    if (isMaximized) {
        // Show restore icon (two overlapping squares)
        maximizeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>';
    } else {
        // Show maximize icon (expand)
        maximizeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h4V4m12 4h-4V4m4 12h-4v4M4 16h4v4"/>';
    }
};

window.showCloseConfirmModal = function () {
    const modal = document.getElementById('close-confirm-modal');
    if (!modal) return;

    // Add blur and show modal
    document.body.classList.add('launcher-blur');
    modal.classList.add('show');

    // Simple click outside to close
    modal.onclick = function (e) {
        if (e.target === modal) {
            hideCloseConfirmModal();
        }
    };
};

window.hideCloseConfirmModal = function () {
    const modal = document.getElementById('close-confirm-modal');
    if (!modal) return;
    document.body.classList.remove('launcher-blur');
    modal.classList.remove('show');
};


window.confirmCloseFromModal = function () {
    try { hideCloseConfirmModal(); } catch (e) { }
    // Proceed with actual shutdown flow
    confirmClose();
};

window.confirmClose = async function () {
    isClosing = true;

    // Use backend command to close (exit(0))
    if (window.__TAURI__) {
        try {
            await window.__TAURI__.core.invoke('close_window');
        } catch (e) {
            console.error("Failed to invoke close_window:", e);
        }
    } else {
        // Mock / Web fallback
        try {
            window.close();
            setTimeout(() => { if (!document.hidden) window.location.href = 'about:blank'; }, 100);
        } catch (e) { window.location.href = 'about:blank'; }
    }
};

window.changeLanguage = async function (lang) {
    window.currentLang = lang;
    // Save to localStorage immediately
    localStorage.setItem('web_launcher_language', lang);

    // Load and apply translations immediately
    await loadTranslations(lang);
    // Force re-apply translations
    applyTranslations();
    // Restore emoji flags after translations
    initEmojiFlags();
    updateLangButtons();
    // Update dynamic content
    updateState().then(() => {
        // Ensure emojis are restored after state update
        initEmojiFlags();
        updateLangButtons();
    });

    // Sync LANGUAGE (launcher language) and clear BOT_LANGUAGE so bot uses launcher language
    // Sync LANGUAGE (launcher language) and clear BOT_LANGUAGE so bot uses launcher language
    if (window.__TAURI__) {
        try {
            await window.__TAURI__.core.invoke('save_setting', { key: 'LANGUAGE', value: lang });
            await window.__TAURI__.core.invoke('save_setting', { key: 'BOT_LANGUAGE', value: '' });
        } catch (e) { console.error("Native settings sync failed", e); }
    } else {
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'LANGUAGE', value: lang })
            });
            // Clear BOT_LANGUAGE so bot uses LANGUAGE (launcher language)
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'BOT_LANGUAGE', value: '' })
            });
        } catch (e) {
            console.error("Failed to sync LANGUAGE:", e);
        }
    }

    showToast(t('ui.launcher.web.language_changed', 'Language changed'), 'success');
};

window.selectLangInModal = function (lang) {
    document.querySelectorAll('.lang-option').forEach(opt => opt.classList.remove('selected'));
    const option = document.querySelector(`.lang-option[data-lang="${lang}"]`);
    if (option) {
        option.classList.add('selected');
    }
    window.currentLang = lang;
};

window.confirmLanguage = async function () {
    await loadTranslations(window.currentLang);
    applyTranslations();
    initEmojiFlags();
    updateLangButtons();
    updateState().then(() => {
        initEmojiFlags();
        updateLangButtons();
    });
    // Sync language with backend
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'LANGUAGE', value: window.currentLang })
        });
        // Clear BOT_LANGUAGE so bot uses LANGUAGE (launcher language)
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'BOT_LANGUAGE', value: '' })
        });
    } catch (e) {
        console.error("Failed to sync language:", e);
    }
    document.getElementById('lang-modal').style.display = 'none';
    langModalShown = true;
    localStorage.setItem('web_launcher_lang_set', 'true');
    showToast(t('ui.launcher.web.language_changed', 'Language changed'), 'success');
}

window.checkFirstLaunch = async function () {
    // 1. First, try to load saved user language from LocalStorage (Fastest)
    const savedLang = localStorage.getItem('web_launcher_language');

    // Allow any saved language, not just en/ru
    if (savedLang) {
        console.log('[Language] Loaded from localStorage:', savedLang);
        window.currentLang = savedLang;
        await loadTranslations(savedLang);
        return;
    }

    // 2. No saved local language, try to get from backend settings
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const data = await res.json();
            // Check 'LANGUAGE' (Launcher/System language) first
            if (data.LANGUAGE) {
                console.log('[Language] Loaded from backend settings:', data.LANGUAGE);
                window.currentLang = data.LANGUAGE;
                await loadTranslations(data.LANGUAGE);
                localStorage.setItem('web_launcher_language', data.LANGUAGE);
                return;
            }
        }
    } catch (e) {
        console.error("[Language] Failed to load language from settings:", e);
    }

    // 3. No saved language anywhere, use system language
    let systemLang = 'en';
    try {
        // Try backend system detection first
        systemLang = await getSystemLanguage();
        console.log('[Language] Detected system language (Backend):', systemLang);
    } catch (e) {
        console.warn('[Language] Backend system detection failed, trying browser:', e);
        // Fallback to browser (navigator) detection
        const navLang = navigator.language || navigator.userLanguage || 'en';
        if (navLang.toLowerCase().includes('ru')) {
            systemLang = 'ru';
        } else if (navLang.toLowerCase().includes('zh') || navLang.toLowerCase().includes('cn')) {
            systemLang = 'zh';
        }
        console.log('[Language] Detected system language (Browser):', systemLang);
    }

    window.currentLang = systemLang;
    await loadTranslations(systemLang);
    localStorage.setItem('web_launcher_language', systemLang);
};

window.hideSplashScreen = function () {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.style.opacity = '0';
        splash.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            splash.style.display = 'none';
        }, 500);
    }

    // Reveal UI elements
    ['sidebar', 'app-header', 'main-area'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    });
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Show window after DOM is ready (prevents white flash)
        if (window.__TAURI__) {
             const showWindow = async () => {
                 try {
                     await window.__TAURI__.core.invoke('show_window');
                     await window.__TAURI__.core.invoke('set_focus'); // Ensure focus
                 } catch(e) { console.warn("Show window attempt failed", e); }
             };

             // Immediate attempt
             showWindow();

             // Backup attempt after small delay (fixes race conditions)
             setTimeout(showWindow, 300);

             // Final backup attempt
             setTimeout(showWindow, 1000);
        }

        try {
            await window.checkFirstLaunch();
        } catch(e) {
            console.error("Critical: checkFirstLaunch failed:", e);
        }

        // Initial UI Updates
        applyTranslations();
        initEmojiFlags();
        updateLangButtons();

        // Hide Splash Screen after 1.5 seconds (User requested)
        setTimeout(window.hideSplashScreen, 1500);

        // Start Loops
        updateState().then(() => {
            initEmojiFlags();
            updateLangButtons();
        });
    } catch (e) {
        console.error("Initialization failed:", e);
        // Ensure splash screen goes away even on error
        setTimeout(window.hideSplashScreen, 1500);
    }
});

/**
 * @deprecated SD settings moved to module-settings.html
 */
function updateSdSettingsLock(installed) {
    // SD settings moved to module-settings.html, this function is no longer needed
    return;
}

/**
 * @deprecated SD install check no longer needed
 */
async function checkSdInstalled() {
    // SD install check disabled - no longer needed
    return;
}

window.showSdInstallModal = function () {
    const modal = document.getElementById('sd-install-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
};

window.hideSdInstallModal = function () {
    const modal = document.getElementById('sd-install-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    // Remember that user dismissed the modal
    localStorage.setItem('sd_install_dismissed', 'true');
};

window.confirmReinstallSd = function () {
    const modal = document.getElementById('reinstall-sd-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
};

window.hideReinstallSdModal = function () {
    const modal = document.getElementById('reinstall-sd-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
};

let sdReinstallPoll = null;
window.showSdReinstallProgress = function () {
    const modal = document.getElementById('sd-reinstall-progress-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
    const statusEl = document.getElementById('sd-reinstall-status');
    if (statusEl) statusEl.textContent = t('ui.launcher.web.reinstall_sd_progress_message', 'Идёт переустановка SD. Пожалуйста, подождите, это может занять несколько минут.');

    // Poll SD installation status
    if (sdReinstallPoll) clearInterval(sdReinstallPoll);
    sdReinstallPoll = setInterval(async () => {
        try {
            const res = await fetch('/api/check_sd_installed');
            if (!res.ok) return;
            const data = await res.json();
            if (data.installed === true) {
                hideSdReinstallProgress();
                showToast(t('ui.launcher.web.reinstall_sd_done', 'Переустановка SD завершена'), 'success', 2500);
                loadSettings();
                return;
            }
        } catch (e) {
            console.warn('Reinstall poll error', e);
        }
    }, 5000);
};

window.hideSdReinstallProgress = function () {
    const modal = document.getElementById('sd-reinstall-progress-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    if (sdReinstallPoll) {
        clearInterval(sdReinstallPoll);
        sdReinstallPoll = null;
    }
};

window.confirmReinstallSdAction = async function () {
    hideReinstallSdModal();
    showSdReinstallProgress();
    showToast(t('ui.launcher.web.reinstall_sd_starting', 'Начало переустановки SD...'), 'info', 2000);
    try {
        await control('reinstall', 'sd');
    } catch (e) {
        showToast(t('ui.launcher.web.reinstall_sd_error', 'Ошибка при переустановке SD'), 'error');
        console.error('Reinstall SD error:', e);
        hideSdReinstallProgress();
    }
};

window.confirmSdInstall = async function () {
    hideSdInstallModal();
    showToast(t('ui.launcher.web.sd_install_starting', 'Запуск установки Stable Diffusion...'), 'success');
    // Start SD installation
    try {
        await control('reinstall', 'sd');
    } catch (e) {
        console.error("Failed to start SD installation:", e);
        showToast(t('ui.launcher.web.sd_install_error', 'Ошибка при запуске установки'), 'error');
    }
};

// LLM Start Modal
let llmStartModalResolve = null;
window.showLlmStartModal = function () {
    return new Promise((resolve) => {
        llmStartModalResolve = resolve;
        const modal = document.getElementById('llm-start-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
        }
    });
};

window.hideLlmStartModal = function () {
    const modal = document.getElementById('llm-start-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    if (llmStartModalResolve) {
        llmStartModalResolve(false);
        llmStartModalResolve = null;
    }
};

window.confirmLlmStart = function () {
    hideLlmStartModal();
    if (llmStartModalResolve) {
        llmStartModalResolve(true);
        llmStartModalResolve = null;
    }
};

// Zoom Support (Ctrl + Scroll)
// Zoom Support removed to ensure responsive browser-like behavior

// Resize handling moved to end of file (includes small screen protection)

// --- Global Tooltip Suppression ---
// User requested to remove "strange tooltips" (native browser titles)
function suppressNativeTooltips() {
    document.querySelectorAll('[title]').forEach(el => {
        const title = el.getAttribute('title');
        if (title) {
            el.setAttribute('data-title', title);
            el.removeAttribute('title');
        }
    });
}

// Run on load
document.addEventListener('DOMContentLoaded', suppressNativeTooltips);

// Capture dynamic elements on hover
document.addEventListener('mouseover', (e) => {
    let target = e.target;
    // Traverse up (e.g. icon inside button)
    while (target && target instanceof Element && target !== document.body) {
        if (target.hasAttribute('title')) {
            const title = target.getAttribute('title');
            if (title) {
                target.setAttribute('data-title', title);
                target.removeAttribute('title');
            }
            // Once found and stripped, we can stop traversing for this element,
            // but effectively we just need to ensure the hovered element doesn't show it.
        }
        target = target.parentNode;
    }
}, { passive: true });

// --- Global Selection Prevention ---
// Force disable selection via JS event, allowing only inputs and console
document.addEventListener('selectstart', (e) => {
    if (e.target.closest('input, textarea, .console-logs-area, [contenteditable]')) {
        return; // Allow
    }
    e.preventDefault(); // Block selection
});

// Force disable start of selection on mousedown (covers double-click text highlight)
document.addEventListener('mousedown', (e) => {
    // Allow inputs and console interaction
    if (e.target.closest('input, textarea, .console-logs-area, [contenteditable]')) {
        return;
    }
    // If it's standard text, prevent default to avoid highlight
    // But allow button clicks implicitly (buttons usually don't trigger selection on click unless dragged)
    // To be safe, we mainly want to stop >1 clicks (double click) or drags
    if (e.detail > 1) {
        e.preventDefault();
    }
}, false);

// ============================================================
// SMALL SCREEN PROTECTION
// If screen < 1400x900, auto maximize + zoom 70%
// ============================================================

const MIN_WINDOW_WIDTH = 1400;
const MIN_WINDOW_HEIGHT = 900;
const SMALL_SCREEN_ZOOM = 0.7;
let isSmallScreen = false;
let wasMaximizedOnSmallScreen = false;

/**
 * Check if current screen is smaller than min window size
 */
function detectSmallScreen() {
    const screenWidth = window.screen.availWidth || window.screen.width;
    const screenHeight = window.screen.availHeight || window.screen.height;
    return screenWidth < MIN_WINDOW_WIDTH || screenHeight < MIN_WINDOW_HEIGHT;
}

/**
 * Apply small screen protection on startup
 */
async function applySmallScreenProtection() {
    if (!window.__TAURI__) return;

    isSmallScreen = detectSmallScreen();

    if (isSmallScreen) {
        console.log('[SmallScreen] Detected small screen, applying protection');

        try {
            const appWindow = window.__TAURI__.window.getCurrentWindow();

            // Set zoom to 70%
            await applyZoom(SMALL_SCREEN_ZOOM);

            // Maximize window
            await appWindow.maximize();
            wasMaximizedOnSmallScreen = true;

            console.log('[SmallScreen] Applied 70% zoom and maximized');
        } catch (e) {
            console.error('[SmallScreen] Protection failed:', e);
        }
    }
}

/**
 * Handle un-maximize on small screen
 */
async function handleSmallScreenUnmaximize() {
    if (!window.__TAURI__ || !isSmallScreen) return;

    try {
        const appWindow = window.__TAURI__.window.getCurrentWindow();
        const isMaximized = await appWindow.isMaximized();

        if (wasMaximizedOnSmallScreen && !isMaximized) {
            // User clicked to exit fullscreen on small screen
            // Calculate safe window size (screen size * 0.85)
            const screenWidth = window.screen.availWidth || window.screen.width;
            const screenHeight = window.screen.availHeight || window.screen.height;

            const safeWidth = Math.floor(screenWidth * 0.85);
            const safeHeight = Math.floor(screenHeight * 0.85);

            // In Tauri v2, LogicalSize might be under .window or .dpi
            const LogicalSize = window.__TAURI__.window.LogicalSize || (window.__TAURI__.dpi ? window.__TAURI__.dpi.LogicalSize : null);

            if (LogicalSize) {
                // Resize window to fit screen
                await appWindow.setSize(new LogicalSize(safeWidth, safeHeight));
                // Center window
                await appWindow.center();
            } else {
                console.warn('[SmallScreen] LogicalSize class not found, skipping resize');
            }

            wasMaximizedOnSmallScreen = false;
            console.log(`[SmallScreen] Resized to ${safeWidth}x${safeHeight} and centered`);
        }
    } catch (e) {
        console.error('[SmallScreen] Un-maximize handling failed:', e);
    }
}

// Hook into resize event for small screen handling
let resizeTimeout;
window.addEventListener('resize', () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(async () => {
        if (window.__TAURI__) {
            try {
                const appWindow = window.__TAURI__.window.getCurrentWindow();
                const isMaximized = await appWindow.isMaximized();
                updateMaximizeIcon(isMaximized);

                // Handle small screen un-maximize
                await handleSmallScreenUnmaximize();
            } catch(e) {}
        }
    }, 200);
});

// Apply protection on startup
document.addEventListener('DOMContentLoaded', () => {
    // Delay to ensure Tauri is ready
    setTimeout(applySmallScreenProtection, 500);
});

