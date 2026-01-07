// Flux Platform Tauri Bridge
// Maps legacy Electron/HTTP API calls to Tauri v2 Commands

(function () {
    console.log("[Tauri Bridge] Initializing...");

    // Helper to check for Tauri presence dynamically
    // This avoids race conditions where this script runs before __TAURI__ is injected
    const getTauri = () => window.__TAURI__;

    // Helper for invoke that handles the check
    const safeInvoke = async (cmd, args) => {
        const tauri = getTauri();
        if (tauri) {
            try {
                return await tauri.core.invoke(cmd, args);
            } catch (e) {
                console.error(`[Tauri Bridge] Invoke error: ${cmd}`, e);
                throw e;
            }
        } else {
            return mockInvoke(cmd, args);
        }
    };

    // Helper for window operations
    const safeWindow = () => {
        const tauri = getTauri();
        if (tauri) {
            return tauri.window.getCurrentWindow();
        } else {
            return mockWindow();
        }
    };

    // --- Mock Implementations ---

    const mockInvoke = async (cmd, args) => {
        console.log(`[Mock Invoke] ${cmd}`, args);
        // Return mock data based on command
        if (cmd === 'get_settings') return { LANGUAGE: 'en', THEME: 'dark' };
        if (cmd === 'get_translations') return {};
        if (cmd === 'get_modules') return [];
        // Mock stats with correct structure { component: { percent: N, ... } }
        if (cmd === 'get_system_stats') return {
            cpu: { percent: Math.floor(Math.random() * 30) + 10 },
            ram: { percent: Math.floor(Math.random() * 40) + 20, used: 8.5, total: 32 },
            gpu: { util: Math.floor(Math.random() * 50), memory: 4 },
            vram: { percent: Math.floor(Math.random() * 60), used: 6, total: 12 },
            disk: { percent: 45, used: 200, total: 500 },
            network: { up: 1024, down: 50000 }
        };
        if (cmd === 'control_module') return true;
        if (cmd === 'get_system_language') return 'en';
        return null;
    };

    const mockWindow = () => ({
        minimize: () => console.log('[Mock] Minimize'),
        toggleMaximize: () => console.log('[Mock] Toggle Maximize'),
        close: () => console.log('[Mock] Close'),
        isMaximized: async () => false,
        unmaximize: () => { },
        maximize: () => { },
        show: () => console.log('[Mock] Show'),
        setFocus: () => console.log('[Mock] SetFocus')
    });


    // Expose generic listener
    window.listenToEvent = async (event, callback) => {
        const tauri = getTauri();
        if (tauri) {
            return await tauri.event.listen(event, callback);
        } else {
            console.log(`[Mock Listen] Subscribed to ${event}`);
            return () => { }; // Unlisten no-op
        }
    };

    // 1. Polyfill window.electronAPI (Window Controls)
    // We bind these dynamically so they check safeWindow() at runtime
    window.electronAPI = {
        minimize: () => safeWindow().minimize(),
        toggleMaximize: async () => {
            const appWindow = safeWindow();
            const tauri = getTauri();
            // Logic differs slightly between mock and real
            if (tauri) {
                try {
                    const isMaximized = await appWindow.isMaximized();
                    if (isMaximized) appWindow.unmaximize(); else appWindow.maximize();
                } catch (e) { console.error("Toggle maximize error", e); }
            } else {
                appWindow.toggleMaximize();
            }
        },
        close: () => safeWindow().close()
    };

    // 2. Intercept fetch for /api/ calls
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
        let url = input;
        if (input instanceof Request) {
            url = input.url;
        }

        // Handle URL objects or full URLs
        let path = url;
        try {
            if (typeof url === 'string' && url.startsWith('http')) {
                const u = new URL(url);
                path = u.pathname;
            }
        } catch (e) { }

        if (typeof path === 'string' && path.startsWith('/api/')) {
            // console.log(`[Tauri Bridge] Intercepting fetch: ${path}`); // Reduced log noise

            try {
                // Log endpoints
                if (path === '/api/log' && init && init.method === 'POST') {
                    if (getTauri()) {
                        try {
                            const body = JSON.parse(init.body);
                            await safeInvoke('add_log', { level: body.level, message: body.message, source: body.source || "WEB" });
                        } catch(e) {}
                    }
                    return new Response(JSON.stringify({ success: true }));
                }

                // Get / Clear Logs
                if (path.startsWith('/api/logs')) {
                    // Clear
                    if (path === '/api/logs/clear' && init && init.method === 'POST') {
                        if (getTauri()) await safeInvoke('clear_logs');
                        return new Response(JSON.stringify({ success: true }));
                    }

                    // Get Logs
                    const u = new URL('http://dummy' + path);
                    const sinceStr = u.searchParams.get('since');
                    const since = sinceStr ? parseFloat(sinceStr) : 0.0;

                    if (getTauri()) {
                        try {
                            const logs = await safeInvoke('get_logs', { since });
                            return new Response(JSON.stringify(logs || []));
                        } catch (e) {
                             console.error("Fetch logs failed", e);
                             return new Response("[]");
                        }
                    } else {
                        // Mock
                        return new Response(JSON.stringify([
                             { timestamp: Date.now()/1000, message: "Mock log entry verify", source: "SYSTEM", level: "info" }
                        ]));
                    }
                }

                // Settings
                if (path === '/api/settings') {
                    if (!init || init.method === 'GET') {
                        const settings = await safeInvoke('get_settings');
                        return new Response(JSON.stringify(settings || {}));
                    }
                    return new Response(JSON.stringify({ success: true }));
                }

                // Translations
                if (path.startsWith('/api/translations')) {
                    const u = new URL('http://dummy' + path); // parse relative path
                    const lang = u.searchParams.get('lang') || 'en';

                    const mockTranslationsEn = {
                        "ui.launcher.button.cancel": "Cancel",
                        "ui.launcher.button.close": "Close",
                        "ui.launcher.diagnostics.status_ok": "OK",
                        "ui.launcher.status.error": "Error",
                        "ui.launcher.web.main_menu": "Main Menu",
                        "ui.launcher.web.chat": "Chat",
                        "ui.launcher.web.modules": "Modules",
                        "ui.launcher.web.settings": "Settings",
                        "ui.launcher.web.console": "Console",
                        "ui.launcher.web.downloads": "Downloads",
                        "ui.launcher.web.cpu": "CPU",
                        "ui.launcher.web.gpu": "GPU",
                        "ui.launcher.web.ram": "RAM",
                        "ui.launcher.web.vram": "VRAM",
                        "ui.launcher.web.disk": "Disk",
                        "ui.launcher.web.network": "Network",
                        "ui.launcher.web.home_title": "Welcome User",
                        "ui.launcher.web.title": "Flux Platform",
                        "ui.launcher.web.downloads_subtitle": "Manage model and module downloads",
                        "ui.launcher.web.downloads_active": "Active Download",
                        "ui.launcher.web.no_active_downloads": "No active downloads",
                        "ui.launcher.web.status_waiting": "Waiting",
                        "ui.launcher.web.progress": "Progress",
                        "ui.launcher.web.downloaded": "Downloaded",
                        "ui.launcher.web.total": "Total",
                        "ui.launcher.web.speed": "Speed",
                        "ui.launcher.web.eta_label": "ETA",
                        "ui.launcher.web.information": "Information",
                        "ui.launcher.web.not_downloading": "Not downloading yet",
                        "ui.launcher.button.minimize": "Minimize",
                        "ui.launcher.button.maximize": "Maximize"
                    };

                    const mockTranslationsRu = {
                        "ui.launcher.button.cancel": "Отмена",
                        "ui.launcher.button.close": "Закрыть",
                        "ui.launcher.web.main_menu": "Главное меню",
                        "ui.launcher.web.chat": "Чат",
                        "ui.launcher.web.modules": "Модули",
                        "ui.launcher.web.settings": "Настройки",
                        "ui.launcher.web.console": "Консоль",
                        "ui.launcher.web.downloads": "Загрузки",
                        "ui.launcher.web.cpu": "ЦП",
                        "ui.launcher.web.gpu": "ГП",
                        "ui.launcher.web.ram": "ОЗУ",
                        "ui.launcher.web.vram": "VRAM",
                        "ui.launcher.web.disk": "Диск",
                        "ui.launcher.web.network": "Сеть",
                        "ui.launcher.web.home_title": "Добро пожаловать",
                        "ui.launcher.web.title": "Платформа Flux",
                        "ui.launcher.web.downloads_subtitle": "Управление загрузками",
                        "ui.launcher.web.downloads_active": "Активная загрузка",
                        "ui.launcher.web.no_active_downloads": "Нет активных загрузок",
                        "ui.launcher.web.status_waiting": "Ожидание",
                        "ui.launcher.web.progress": "Прогресс",
                        "ui.launcher.web.downloaded": "Скачано",
                        "ui.launcher.web.total": "Всего",
                        "ui.launcher.web.speed": "Скорость",
                        "ui.launcher.web.eta_label": "Осталось",
                        "ui.launcher.web.information": "Информация",
                        "ui.launcher.web.not_downloading": "Загрузка не идет",
                        "ui.launcher.button.minimize": "Свернуть",
                        "ui.launcher.button.maximize": "Развернуть"
                    };

                    const mockTranslationsZh = {
                        "ui.launcher.button.cancel": "取消",
                        "ui.launcher.button.close": "关闭",
                        "ui.launcher.web.main_menu": "主菜单",
                        "ui.launcher.web.chat": "聊天",
                        "ui.launcher.web.modules": "模块",
                        "ui.launcher.web.settings": "设置",
                        "ui.launcher.web.console": "控制台",
                        "ui.launcher.web.downloads": "下载",
                        "ui.launcher.web.cpu": "CPU",
                        "ui.launcher.web.gpu": "GPU",
                        "ui.launcher.web.ram": "内存",
                        "ui.launcher.web.vram": "显存",
                        "ui.launcher.web.disk": "磁盘",
                        "ui.launcher.web.network": "网络",
                        "ui.launcher.web.home_title": "欢迎用户",
                        "ui.launcher.web.title": "Flux平台",
                        "ui.launcher.web.downloads_subtitle": "管理模型和模块下载",
                        "ui.launcher.web.downloads_active": "当前下载",
                        "ui.launcher.web.no_active_downloads": "无活动下载",
                        "ui.launcher.web.status_waiting": "等待中",
                        "ui.launcher.web.progress": "进度",
                        "ui.launcher.web.downloaded": "已下载",
                        "ui.launcher.web.total": "总计",
                        "ui.launcher.web.speed": "速度",
                        "ui.launcher.web.eta_label": "剩余时间",
                        "ui.launcher.web.information": "信息",
                        "ui.launcher.web.not_downloading": "未开始下载",
                        "ui.launcher.button.minimize": "最小化",
                        "ui.launcher.button.maximize": "最大化"
                    };

                    let data = {};
                    if (lang === 'ru') data = mockTranslationsRu;
                    else if (lang === 'zh') data = mockTranslationsZh;
                    else data = mockTranslationsEn;

                    const translations = getTauri() ? await safeInvoke('get_translations', { lang }) : data;
                    return new Response(JSON.stringify(translations));
                }

                if (path === '/api/system_stats') {
                    if (getTauri()) {
                         return new Response(JSON.stringify(await safeInvoke('get_system_stats')));
                    }
                    // Mock Data
                    const stats = {
                        cpu: { percent: Math.round(15 + Math.random() * 10), cores: 16, name: "Mock CPU" },
                        ram: { percent: 45, used_gb: 14.5, total_gb: 32.0 },
                        gpu: { util: Math.round(Math.random() * 30), memory: 8 },
                        vram: { percent: 30, used: 2.4, total: 8.0 },
                        disk: { percent: 25, used: 256, total: 1024 },
                        network: { up: 1024, down: 50000 }
                    };
                    return new Response(JSON.stringify(stats));
                }

                // System State
                if (path === '/api/state') {
                    return new Response(JSON.stringify({
                        services: { "LLM": "running", "SD": "stopped", "TTS": "running" },
                        timestamp: Date.now()
                    }));
                }

                if (path === '/api/system_language') {
                    if (getTauri()) {
                         const lang = await safeInvoke('get_system_language');
                         return new Response(JSON.stringify({ language: lang || 'en' }));
                    }
                    return new Response(JSON.stringify({ language: 'en' }));
                }

                // Catch-all for other invoke calls if we were mapping them all here...

                // Fallback for unknown API
                return new Response(JSON.stringify({ success: true, mocked: true }));

            } catch (e) {
                console.error(`[Tauri Bridge] Error handling ${path}:`, e);
                return new Response(JSON.stringify({ error: e.toString() }), { status: 500 });
            }
        }

        return originalFetch(input, init);
    };

    console.log("[Tauri Bridge] Setup complete.");
})();

