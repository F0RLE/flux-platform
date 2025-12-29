const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

if (!process.versions.electron) {
    console.error('ERROR: Not running in Electron! This may be WebView.');
}

let mainWindow;

const getSettingsPath = () => {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'window-settings.json');
};

const loadWindowSettings = () => {
    try {
        const settingsPath = getSettingsPath();
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf-8');
            const settings = JSON.parse(data);
            return {
                width: settings.width || 1600,
                height: settings.height || 1000,
                zoomLevel: settings.zoomLevel !== undefined ? settings.zoomLevel : 0
            };
        }
    } catch (e) { }
    return {
        width: 1600,
        height: 1000,
        zoomLevel: 0
    };
};

const saveWindowSettings = (width, height, zoomLevel) => {
    try {
        const settingsPath = getSettingsPath();
        fs.writeFileSync(settingsPath, JSON.stringify({ width, height, zoomLevel }, null, 2), 'utf-8');
    } catch (e) { }
};

function createWindow() {
    const settings = loadWindowSettings();

    mainWindow = new BrowserWindow({
        width: settings.width,
        height: settings.height,
        frame: false,
        title: 'Flux Platform',
        titleBarStyle: 'hidden',
        autoHideMenuBar: true,
        skipTaskbar: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: false,
            webSecurity: true,
            sandbox: false
        },
        backgroundColor: '#111015',
        show: false,
        transparent: false,
        hasShadow: true,
        resizable: true,
        minimizable: true,
        maximizable: true,
        closable: true,
        icon: path.join(__dirname, '../web/assets/icons/icon.png')
    });

    mainWindow.setMenuBarVisibility(false);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.webContents.setZoomLevel(settings.zoomLevel);

    let resizeTimeout;
    mainWindow.on('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            try {
                if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMaximized()) {
                    const size = mainWindow.getSize();
                    const zoomLevel = mainWindow.webContents.getZoomLevel();
                    saveWindowSettings(size[0], size[1], zoomLevel);
                }
            } catch (e) { }
        }, 500);
    });

    let moveTimeout;
    mainWindow.on('move', () => {
        clearTimeout(moveTimeout);
        moveTimeout = setTimeout(() => {
            try {
                if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMaximized()) {
                    const size = mainWindow.getSize();
                    const zoomLevel = mainWindow.webContents.getZoomLevel();
                    saveWindowSettings(size[0], size[1], zoomLevel);
                }
            } catch (e) { }
        }, 500);
    });

    const injectWindowControls = () => {
        mainWindow.webContents.executeJavaScript(`
            (function() {
                // Generate Icon from SVG if needed
                setTimeout(() => {
                    const svg = document.querySelector('.splash-logo-svg');
                    if (svg) {
                        const canvas = document.createElement('canvas');
                        canvas.width = 512;
                        canvas.height = 512;
                        const ctx = canvas.getContext('2d');
                        const img = new Image();
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
                        const url = URL.createObjectURL(blob);
                        
                        img.onload = function() {
                            ctx.drawImage(img, 0, 0, 512, 512);
                            const pngData = canvas.toDataURL('image/png');
                            if (typeof require !== 'undefined') {
                                const { ipcRenderer } = require('electron');
                                ipcRenderer.send('save-icon-data', pngData);
                            }
                            URL.revokeObjectURL(url);
                        };
                        img.src = url;
                    }
                }, 1000);

                if (typeof require === 'undefined') {
                    window.electronAPI = {
                        minimize: () => {},
                        toggleMaximize: () => {}
                    };
                    return;
                }
                try {
                    const { ipcRenderer } = require('electron');
                    window.electronAPI = {
                        minimize: () => ipcRenderer.send('window-minimize'),
                        toggleMaximize: () => ipcRenderer.send('window-toggle-maximize')
                    };
                    ipcRenderer.on('window-state-changed', (event, isMaximized) => {
                        if (typeof updateMaximizeIcon === 'function') {
                            updateMaximizeIcon(isMaximized);
                        }
                    });
                } catch (e) {
                    window.electronAPI = {
                        minimize: () => {},
                        toggleMaximize: () => {}
                    };
                }
            })();
        `).catch(() => { });
    };

    mainWindow.webContents.on('did-finish-load', () => {
        setTimeout(injectWindowControls, 10);

        mainWindow.webContents.executeJavaScript(`
            (function() {
                let isZooming = false;
                document.addEventListener('wheel', function(e) {
                    if (e.ctrlKey && !isZooming) {
                        isZooming = true;
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const zoomDirection = e.deltaY < 0 ? 'in' : 'out';
                        
                        if (typeof require !== 'undefined') {
                            try {
                                const { ipcRenderer } = require('electron');
                                ipcRenderer.send('page-zoom-wheel', { direction: zoomDirection });
                        } catch (err) {}
                        }
                        
                        setTimeout(() => { isZooming = false; }, 50);
                    }
                }, { passive: false });
            })();
        `).catch(() => { });
    });

    mainWindow.on('maximize', () => {
        mainWindow.webContents.executeJavaScript(`
            if (typeof updateMaximizeIcon === 'function') {
                updateMaximizeIcon(true);
            }
        `).catch(() => { });
    });

    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.executeJavaScript(`
            if (typeof updateMaximizeIcon === 'function') {
                updateMaximizeIcon(false);
            }
        `).catch(() => { });
    });

    const launcherUrl = process.env.LAUNCHER_URL || 'http://localhost:18888';

    const addDragRegion = () => {
        mainWindow.webContents.executeJavaScript(`
            (function() {
                const existing = document.getElementById('electron-drag-region');
                if (existing) existing.remove();
                const dragRegion = document.createElement('div');
                dragRegion.id = 'electron-drag-region';
                dragRegion.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; height: 30px; -webkit-app-region: drag; z-index: 9999; pointer-events: auto;';
                document.body.appendChild(dragRegion);
            })();
        `).catch(() => { });
    };

    addDragRegion();
    mainWindow.webContents.once('did-finish-load', () => {
        setTimeout(addDragRegion, 10);
    });

    mainWindow.on('close', (event) => {
        try {
            if (mainWindow && !mainWindow.isDestroyed()) {
                if (!mainWindow.isMaximized()) {
                    const size = mainWindow.getSize();
                    const zoomLevel = mainWindow.webContents.getZoomLevel();
                    saveWindowSettings(size[0], size[1], zoomLevel);
                }
            }
        } catch (e) { }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode) => {
        if (errorCode === -102 || errorCode === -106 || errorCode === -105) {
            pageLoaded = false;
            serverReady = false;
        }
    });

    let retryCount = 0;
    const maxRetries = 120;
    let checkServerInterval = null;
    let currentInterval = 100;
    const maxInterval = 2000;
    let pageLoaded = false;
    let serverReady = false;

    const checkServer = async () => {
        if (pageLoaded && serverReady) {
            if (checkServerInterval) {
                clearInterval(checkServerInterval);
                checkServerInterval = null;
            }
            return;
        }

        if (retryCount >= maxRetries) {
            if (checkServerInterval) {
                clearInterval(checkServerInterval);
                checkServerInterval = null;
            }
            return;
        }
        retryCount++;

        try {
            const http = require('http');
            const url = new URL(launcherUrl);
            const healthUrl = `${url.protocol}//${url.host}/api/health`;

            const request = http.get(healthUrl, { timeout: 150 }, (res) => {
                if (res.statusCode === 200) {
                    serverReady = true;
                    const currentURL = mainWindow.webContents.getURL();
                    if (!pageLoaded && (currentURL.startsWith('data:') || currentURL === 'about:blank' || currentURL.includes('error') || !currentURL)) {
                        mainWindow.loadURL(launcherUrl).catch(() => {
                            pageLoaded = false;
                            serverReady = false;
                        });
                    }
                }
                res.on('data', () => { });
                res.on('end', () => { });
            });

            request.on('error', () => { });

            request.on('timeout', () => {
                request.destroy();
            });

            request.setTimeout(150);
        } catch (e) {
            if (retryCount >= 5 && !pageLoaded) {
                const currentURL = mainWindow.webContents.getURL();
                if (currentURL.startsWith('data:') || currentURL === 'about:blank') {
                    mainWindow.loadURL(launcherUrl).catch(() => { });
                }
            }
        }

        if (retryCount > 15 && currentInterval < maxInterval) {
            currentInterval = Math.min(currentInterval * 1.1, maxInterval);
            if (checkServerInterval) {
                clearInterval(checkServerInterval);
                checkServerInterval = setInterval(checkServer, currentInterval);
            }
        }
    };

    checkServerInterval = setInterval(checkServer, currentInterval);

    mainWindow.webContents.on('did-finish-load', () => {
        const currentURL = mainWindow.webContents.getURL();
        if (currentURL && !currentURL.startsWith('data:') && currentURL !== 'about:blank') {
            pageLoaded = true;
            serverReady = true;
            if (checkServerInterval) {
                clearInterval(checkServerInterval);
                checkServerInterval = null;
                retryCount = 0;
            }
            setTimeout(addDragRegion, 10);
        }
    });

    mainWindow.webContents.on('did-navigate', () => {
        setTimeout(addDragRegion, 10);
    });
}

app.whenReady().then(() => {
    if (process.platform === 'win32') {
        app.setAppUserModelId('Flux.Platform');
    }

    // Global permission handler for microphone/media
    session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
        if (permission === 'media') {
            return true;
        }
        return true; // Allow all for now to be safe? Or just media.
    });
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media') {
            callback(true);
        } else {
            callback(true); // Default allow for development
        }
    });

    createWindow();

    mainWindow.setMenuBarVisibility(false);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    const { globalShortcut } = require('electron');
    globalShortcut.register('CommandOrControl+R', () => {
        if (mainWindow) mainWindow.reload();
    });
    globalShortcut.register('F5', () => {
        if (mainWindow) mainWindow.reload();
    });
});

app.on('ready', () => { });

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Cleanup: Request backend to stop all services before the app quits
app.on('before-quit', async (event) => {
    // Prevent quitting until cleanup is done
    event.preventDefault();

    const http = require('http');
    const launcherUrl = process.env.LAUNCHER_URL || 'http://localhost:18888';
    const stopUrl = new URL('/api/control?action=stop&service=all', launcherUrl);

    try {
        const request = http.get(stopUrl.href, { timeout: 3000 }, (res) => {
            res.on('data', () => { }); // Consume response
            res.on('end', () => {
                // Allow quit after cleanup request
                app.exit(0);
            });
        });
        request.on('error', () => {
            app.exit(0); // Exit anyway on error
        });
        request.on('timeout', () => {
            request.destroy();
            app.exit(0); // Exit anyway on timeout
        });
    } catch (e) {
        app.exit(0); // Exit on any exception
    }
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (url.startsWith('http://localhost:') || url.startsWith('https://localhost:')) {
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});

ipcMain.on('launcher-ready', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
    }
});

ipcMain.on('save-icon-data', (event, base64Data) => {
    try {
        const data = base64Data.replace(/^data:image\/png;base64,/, "");
        const iconPath = path.join(__dirname, '../web/assets/icons/icon.png');

        // Save as pure PNG
        fs.writeFileSync(iconPath, data, 'base64');

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setIcon(iconPath);
        }
    } catch (e) {
        // console.error(e);
    }
});


ipcMain.on('window-minimize', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

ipcMain.on('window-toggle-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('window-resize', (event, { width, height }) => {
    if (mainWindow) {
        mainWindow.setSize(width, height);
    }
});

ipcMain.on('page-zoom-wheel', (event, { direction }) => {
    try {
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
            const currentZoom = mainWindow.webContents.getZoomLevel();
            const zoomStep = 0.5;
            const minZoom = -3;
            const maxZoom = 5;

            const newZoom = direction === 'in'
                ? Math.min(maxZoom, currentZoom + zoomStep)
                : Math.max(minZoom, currentZoom - zoomStep);

            mainWindow.webContents.setZoomLevel(newZoom);

            const size = mainWindow.getSize();
            saveWindowSettings(size[0], size[1], newZoom);
        }
    } catch (e) { }
});

