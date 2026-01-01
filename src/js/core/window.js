// Window control functions (for Electron)
window.minimizeWindow = function () {
    if (window.electronAPI && window.electronAPI.minimize) {
        window.electronAPI.minimize();
    } else {
        // Fallback for browser
        console.log('Minimize window');
    }
};

window.toggleMaximizeWindow = function () {
    if (window.electronAPI && window.electronAPI.toggleMaximize) {
        window.electronAPI.toggleMaximize();
    } else {
        // Fallback for browser
        console.log('Toggle maximize window');
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
    // Add blur to entire launcher (body)
    document.body.classList.add('launcher-blur');
    // Block all clicks except modal buttons
    const blockClicks = function (e) {
        // Allow clicks only on modal overlay and its children
        if (!e.target.closest('#close-confirm-modal')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
    };
    // Add click blocker to document
    document.addEventListener('click', blockClicks, true);
    modal._clickBlocker = blockClicks;
    // Prevent clicks outside modal
    modal.style.pointerEvents = 'auto';
    if (modal.style.display === 'none') modal.style.display = ''; // Reset inline none if present
    // modal.style.display = 'flex'; // Handled by CSS visibility
    modal.classList.add('show');
    // Allow closing by clicking on background
    modal.onclick = function (e) {
        if (e.target === modal) {
            hideCloseConfirmModal();
        }
    };
};

window.hideCloseConfirmModal = function () {
    const modal = document.getElementById('close-confirm-modal');
    if (!modal) return;
    // Remove blur from entire launcher
    document.body.classList.remove('launcher-blur');
    // Remove click blocker
    if (modal._clickBlocker) {
        document.removeEventListener('click', modal._clickBlocker, true);
        modal._clickBlocker = null;
    }
    // Remove onclick handler
    modal.onclick = null;
    // modal.style.display = 'none'; // Handled by CSS visibility
    modal.classList.remove('show');
};

window.confirmCloseFromModal = function () {
    try { hideCloseConfirmModal(); } catch (e) { }
    // Proceed with actual shutdown flow
    confirmClose();
};

window.confirmClose = async function () {
    isClosing = true;

    // Close window immediately - don't wait for processes to stop
    try {
        window.close();
        // If close() doesn't work, redirect to about:blank
        setTimeout(() => {
            if (!document.hidden) {
                window.location.href = 'about:blank';
            }
        }, 100);
    } catch (e) {
        // Fallback: redirect to blank page
        window.location.href = 'about:blank';
    }

    // Stop all services and clear logs in background (non-blocking)
    // Use sendBeacon for reliable delivery even after window closes
    try {
        if (navigator && typeof navigator.sendBeacon === 'function') {
            // Clear logs
            navigator.sendBeacon('/api/logs/clear', '');
            // Stop all services
            const stopData = JSON.stringify({ action: 'stop', service: 'all' });
            navigator.sendBeacon('/api/control', stopData);
            // Shutdown launcher process
            navigator.sendBeacon('/api/shutdown', '');
        } else {
            // Fallback: use fetch with keepalive
            fetch('/api/logs/clear', { method: 'POST', keepalive: true }).catch(() => { });
            fetch('/api/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'stop', service: 'all' }),
                keepalive: true
            }).catch(() => { });
            fetch('/api/shutdown', { method: 'POST', keepalive: true }).catch(() => { });
        }
    } catch (e) {
        // Ignore errors - window is already closing
    }

    // Also clear UI logs immediately
    try {
        ['logs-general', 'logs-bot', 'logs-llm', 'logs-sd'].forEach(id => {
            const pane = document.getElementById(id);
            if (pane) pane.innerHTML = '';
        });
        allLogs = [];
        lastTimestamp = 0;
    } catch (e) { }
};

window.changeLanguage = async function (lang) {
    currentLang = lang;
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
    currentLang = lang;
};

window.confirmLanguage = async function () {
    await loadTranslations(currentLang);
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
            body: JSON.stringify({ key: 'LANGUAGE', value: currentLang })
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
    // First, try to load saved user language
    const savedLang = localStorage.getItem('web_launcher_language');

    if (savedLang && (savedLang === 'en' || savedLang === 'ru')) {
        // User has previously selected a language, use it
        currentLang = savedLang;
        await loadTranslations(savedLang);
        return;
    }

    // No saved language, try to get from backend settings
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.BOT_LANGUAGE && (data.BOT_LANGUAGE === 'en' || data.BOT_LANGUAGE === 'ru')) {
            currentLang = data.BOT_LANGUAGE;
            await loadTranslations(data.BOT_LANGUAGE);
            localStorage.setItem('web_launcher_language', data.BOT_LANGUAGE);
            return;
        }
    } catch (e) {
        console.error("Failed to load language from settings:", e);
    }

    // No saved language, use system language
    const systemLang = await getSystemLanguage();
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
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.checkFirstLaunch();

        // Initial UI Updates
        applyTranslations();
        initEmojiFlags();
        updateLangButtons();

        // Hide Splash Screen
        setTimeout(window.hideSplashScreen, 500);

        // Start Loops
        updateState().then(() => {
            initEmojiFlags();
            updateLangButtons();
        });
    } catch (e) {
        console.error("Initialization failed:", e);
        // Ensure splash screen goes away even on error
        setTimeout(window.hideSplashScreen, 1000);
    }
});

function updateSdSettingsLock(installed) {
    // SD settings moved to module-settings.html, this function is no longer needed
    return;
}

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
