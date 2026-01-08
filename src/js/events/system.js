/**
 * System Events - Subscribe to system monitoring events from Rust backend
 *
 * The backend emits 'system_stats' events every second with full system info.
 * This replaces polling via setInterval + invoke.
 */

// Callback storage for system stats updates
let systemStatsCallback = null;
let unlistenFn = null;

/**
 * Subscribe to system stats events
 * @param {Function} callback - Called with stats object on each update
 * @returns {Promise<Function>} Unsubscribe function
 */
export async function subscribeToSystemStats(callback) {
    systemStatsCallback = callback;

    // Use Tauri's listen API
    if (window.__TAURI__) {
        try {
            const { listen } = window.__TAURI__.event;

            unlistenFn = await listen('system_stats', (event) => {
                if (systemStatsCallback) {
                    systemStatsCallback(event.payload);
                }
            });

            return unlistenFn;
        } catch (e) {
            console.warn('[System Events] Tauri listen failed, falling back to polling:', e);
            return fallbackPolling(callback);
        }
    } else {
        console.warn('[System Events] Tauri not available, falling back to polling');
        return fallbackPolling(callback);
    }
}

/**
 * Unsubscribe from system stats events
 */
export function unsubscribeFromSystemStats() {
    systemStatsCallback = null;
    if (unlistenFn) {
        unlistenFn();
        unlistenFn = null;
    }
}

/**
 * Fallback polling for non-Tauri environments (testing)
 */
async function fallbackPolling(callback) {
    const pollInterval = setInterval(async () => {
        try {
            let stats;
            if (window.__TAURI__) {
                stats = await window.__TAURI__.core.invoke('get_system_stats');
            } else {
                // Fetch from bridge interceptor (Mock Mode)
                const res = await fetch('/api/system_stats');
                if (res.ok) {
                    stats = await res.json();
                }
            }

            if (stats && callback) {
                callback(stats);
            }
        } catch (e) {
            console.error('[System Events] Polling error:', e);
        }
    }, 2000);

    return () => clearInterval(pollInterval);
}

/**
 * Get current system stats (one-time, for compatibility)
 * Prefer subscribeToSystemStats for continuous updates
 */
export async function getSystemStatsOnce() {
    if (window.__TAURI__) {
        return await window.__TAURI__.core.invoke('get_system_stats');
    }
    return null;
}
