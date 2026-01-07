/**
 * UI State Manager
 * Persists UI state (sidebar, visibility toggles, card sizes) to Tauri backend
 * Replaces localStorage with file-based storage in %APPDATA%/FluxData/User/UI/
 *
 * OPTIMIZATION: State is only saved on app close to avoid UI lag
 */

// Cached UI state (all changes are in-memory only)
let cachedUIState = null;
let isDirty = false; // Track if state needs saving

/**
 * Default UI state values
 */
const DEFAULT_UI_STATE = {
    sidebar_collapsed: false,
    sidebar_width: 280,
    hidden_nav_items: [],
    hidden_monitors: [],
    card_widths: {},
    download_limit_enabled: false,
    download_max_speed: 50
};

/**
 * Load UI state from Tauri backend
 * Falls back to defaults if not available
 */
async function loadUIState() {
    try {
        if (window.__TAURI__) {
            cachedUIState = await window.__TAURI__.core.invoke('get_ui_state');
            console.log('[UIState] Loaded from backend');
        } else {
            // Fallback to localStorage for dev mode
            const stored = localStorage.getItem('flux_ui_state');
            cachedUIState = stored ? JSON.parse(stored) : { ...DEFAULT_UI_STATE };
            console.log('[UIState] Loaded from localStorage (dev mode)');
        }
    } catch (e) {
        console.warn('[UIState] Failed to load, using defaults:', e);
        cachedUIState = { ...DEFAULT_UI_STATE };
    }

    // Migrate from old localStorage keys if no data
    if (!cachedUIState || Object.keys(cachedUIState).length === 0) {
        cachedUIState = migrateFromLocalStorage();
        isDirty = true; // Mark for save since we migrated
    }

    isDirty = false;
    return cachedUIState;
}

/**
 * Migrate from old localStorage keys to new format
 */
function migrateFromLocalStorage() {
    console.log('[UIState] Migrating from localStorage...');

    const state = { ...DEFAULT_UI_STATE };

    try {
        // Sidebar state
        const sidebarState = localStorage.getItem('sidebarState');
        if (sidebarState === 'collapsed') {
            state.sidebar_collapsed = true;
        }

        const sidebarWidth = localStorage.getItem('sidebarWidth') || localStorage.getItem('sidebar_width');
        if (sidebarWidth) {
            state.sidebar_width = parseInt(sidebarWidth) || 280;
        }

        // Hidden nav items
        const hiddenNavItems = localStorage.getItem('hiddenNavItems');
        if (hiddenNavItems) {
            try {
                state.hidden_nav_items = JSON.parse(hiddenNavItems);
            } catch {}
        }

        // Hidden monitors
        const hiddenMonitors = localStorage.getItem('hiddenMonitors');
        if (hiddenMonitors) {
            try {
                state.hidden_monitors = JSON.parse(hiddenMonitors);
            } catch {}
        }

        // Card widths
        const cardWidths = localStorage.getItem('settings_card_widths');
        if (cardWidths) {
            try {
                state.card_widths = JSON.parse(cardWidths);
            } catch {}
        }

        // Download settings
        const downloadSettings = localStorage.getItem('downloadSettings');
        if (downloadSettings) {
            try {
                const ds = JSON.parse(downloadSettings);
                state.download_limit_enabled = ds.limitEnabled || false;
                state.download_max_speed = ds.maxSpeed || 50;
            } catch {}
        }

        console.log('[UIState] Migration complete');
    } catch (e) {
        console.warn('[UIState] Migration failed:', e);
    }

    return state;
}

/**
 * Mark state as dirty (needs saving)
 * No actual save happens - just marks for save on exit
 */
function markDirty() {
    isDirty = true;
}

/**
 * Save UI state to backend (only called on exit)
 * Uses fire-and-forget pattern to not block UI
 */
function saveUIStateAsync() {
    if (!cachedUIState || !isDirty) return;

    try {
        if (window.__TAURI__) {
            // Fire and forget - don't await
            window.__TAURI__.core.invoke('save_ui_state', { state: cachedUIState })
                .then(() => console.log('[UIState] Saved to backend'))
                .catch(e => console.error('[UIState] Save error:', e));
        } else {
            // localStorage is sync and fast
            localStorage.setItem('flux_ui_state', JSON.stringify(cachedUIState));
        }
        isDirty = false;
    } catch (e) {
        console.error('[UIState] Failed to save:', e);
    }
}

/**
 * [DEPRECATED] Alias for backward compatibility
 */
function saveUIState() {
    // No-op during normal usage - only saves on exit
    // Just mark as dirty
    markDirty();
}

/**
 * Save UI state immediately (blocking, for critical saves)
 */
async function saveUIStateImmediate() {
    if (!cachedUIState || !isDirty) return;

    try {
        if (window.__TAURI__) {
            await window.__TAURI__.core.invoke('save_ui_state', { state: cachedUIState });
        } else {
            localStorage.setItem('flux_ui_state', JSON.stringify(cachedUIState));
        }
        isDirty = false;
    } catch (e) {
        console.error('[UIState] Failed to save immediately:', e);
    }
}

// ============ Getters and Setters ============

function getSidebarCollapsed() {
    return cachedUIState?.sidebar_collapsed ?? false;
}

function setSidebarCollapsed(collapsed) {
    if (!cachedUIState) cachedUIState = { ...DEFAULT_UI_STATE };
    cachedUIState.sidebar_collapsed = collapsed;
    markDirty();
}

function getSidebarWidth() {
    return cachedUIState?.sidebar_width ?? 280;
}

function setSidebarWidth(width) {
    if (!cachedUIState) cachedUIState = { ...DEFAULT_UI_STATE };
    cachedUIState.sidebar_width = width;
    markDirty();
}

function getHiddenNavItems() {
    return cachedUIState?.hidden_nav_items ?? [];
}

function setHiddenNavItems(items) {
    if (!cachedUIState) cachedUIState = { ...DEFAULT_UI_STATE };
    cachedUIState.hidden_nav_items = items;
    markDirty();
}

function getHiddenMonitors() {
    return cachedUIState?.hidden_monitors ?? [];
}

function setHiddenMonitors(items) {
    if (!cachedUIState) cachedUIState = { ...DEFAULT_UI_STATE };
    cachedUIState.hidden_monitors = items;
    markDirty();
}

function getCardWidths() {
    return cachedUIState?.card_widths ?? {};
}

function setCardWidth(cardId, width) {
    if (!cachedUIState) cachedUIState = { ...DEFAULT_UI_STATE };
    if (!cachedUIState.card_widths) cachedUIState.card_widths = {};
    cachedUIState.card_widths[cardId] = width;
    markDirty();
}

function getDownloadSettings() {
    return {
        limitEnabled: cachedUIState?.download_limit_enabled ?? false,
        maxSpeed: cachedUIState?.download_max_speed ?? 50
    };
}

function setDownloadSettings(limitEnabled, maxSpeed) {
    if (!cachedUIState) cachedUIState = { ...DEFAULT_UI_STATE };
    cachedUIState.download_limit_enabled = limitEnabled;
    cachedUIState.download_max_speed = maxSpeed;
    markDirty();
}

// ============ Auto-save on exit ============

// Save when page is about to unload
window.addEventListener('beforeunload', () => {
    saveUIStateAsync();
});

// Save when tab becomes hidden (user switches away)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isDirty) {
        saveUIStateAsync();
    }
});

// Export to window
window.uiState = {
    load: loadUIState,
    save: saveUIState,           // Now just marks dirty
    saveImmediate: saveUIStateImmediate,
    saveAsync: saveUIStateAsync,

    getSidebarCollapsed,
    setSidebarCollapsed,
    getSidebarWidth,
    setSidebarWidth,
    getHiddenNavItems,
    setHiddenNavItems,
    getHiddenMonitors,
    setHiddenMonitors,
    getCardWidths,
    setCardWidth,
    getDownloadSettings,
    setDownloadSettings,

    // For debugging
    get state() { return cachedUIState; },
    get dirty() { return isDirty; }
};

console.log('[UIState] Module loaded (save-on-exit mode)');

