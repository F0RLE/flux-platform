
import { subscribeToSystemStats } from '../events/system.js';

let isMonitoringInit = false;

function initMonitoring() {
    if (isMonitoringInit) return;
    isMonitoringInit = true;

    console.log("[Monitoring] Initializing...");
    const cpuVal = document.getElementById('cpu-percent');

    if (!cpuVal) {
        console.warn("[Monitoring] DOM not ready or elements missing");
        isMonitoringInit = false; // Reset to try again later
        return;
    }

    // Set initial loading state
    setLoadingState();

    subscribeToSystemStats((stats) => {
        updateUI(stats);
    });

    if (!window.__TAURI__) {
        const titleEl = document.querySelector('[data-card-id="monitoring"] .card-title');
        if (titleEl) {
            const warningCallback = () => {
                const badge = document.createElement('span');
                badge.textContent = "(Demo Data)";
                badge.style.color = "var(--warning)";
                badge.style.fontSize = "0.8rem";
                badge.style.marginLeft = "0.5rem";
                badge.style.fontWeight = "bold";
                const titleText = titleEl.querySelector('[data-i18n]');
                if (titleText) titleText.appendChild(badge);
            };
            setTimeout(warningCallback, 500);
        }
    }
}

// Ensure init runs even if DOMContentLoaded missed
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMonitoring);
} else {
    initMonitoring();
}

function updateUI(stats) {
    const cpuVal = document.getElementById('cpu-percent');
    const cpuBar = document.getElementById('cpu-progress');
    const gpuVal = document.getElementById('gpu-util');
    const gpuBar = document.getElementById('gpu-progress');
    const ramVal = document.getElementById('ram-percent');
    const ramBar = document.getElementById('ram-progress');
    const vramVal = document.getElementById('gpu-memory');
    const vramBar = document.getElementById('vram-progress');
    const diskVal = document.getElementById('disk-usage');
    const diskBar = document.getElementById('disk-progress');
    const netVal = document.getElementById('network-status');
    const netBar = document.getElementById('network-progress');

    // CPU
    if (stats.cpu && cpuVal && cpuBar) {
        cpuVal.textContent = `${Math.round(stats.cpu.percent)}%`;
        cpuBar.style.width = `${stats.cpu.percent}%`;
    }

    // RAM (Show GB)
    if (stats.ram && ramVal && ramBar) {
        const used = stats.ram.used_gb ? stats.ram.used_gb.toFixed(1) : ((stats.ram.percent / 100) * 16).toFixed(1);
        const total = stats.ram.total_gb ? stats.ram.total_gb.toFixed(1) : "16.0";
        ramVal.textContent = `${used} / ${total} GB`;
        ramBar.style.width = `${stats.ram.percent}%`;
    }

    // GPU (Util %)
    if (stats.gpu && gpuVal && gpuBar) {
        const util = stats.gpu.usage !== undefined ? stats.gpu.usage : stats.gpu.util;
        gpuVal.textContent = `${util}%`;
        gpuBar.style.width = `${Math.min(100, util)}%`;
    } else if (gpuVal) {
        gpuVal.textContent = "--";
        gpuBar.style.width = "0%";
    }

    // VRAM (Show GB)
    if (stats.vram && vramVal && vramBar) {
        const used = stats.vram.used_gb !== undefined ? stats.vram.used_gb.toFixed(1) : (stats.vram.used ? stats.vram.used.toFixed(1) : "0.0");
        const total = stats.vram.total_gb !== undefined ? stats.vram.total_gb.toFixed(1) : (stats.vram.total ? stats.vram.total.toFixed(1) : "0.0");
        vramVal.textContent = `${used} / ${total} GB`;
        vramBar.style.width = `${stats.vram.percent}%`;
    } else if (vramVal) {
        vramVal.textContent = "--";
        vramBar.style.width = "0%";
    }

    // Disk (Show Read/Write Speed)
    if (stats.disk && diskVal && diskBar) {
        const read = stats.disk.read_rate || 0;
        const write = stats.disk.write_rate || 0;

        const fmtSpeed = (bytes) => {
            const mb = bytes / (1024 * 1024);
            if (mb < 1000) return `${mb.toFixed(1)} MB/s`;
            return `${(mb/1024).toFixed(1)} GB/s`;
        };

        diskVal.textContent = `R: ${fmtSpeed(read)} W: ${fmtSpeed(write)}`;

        // Activity bar based on backend calculated percent
        const activityPct = stats.disk.activity_percent || 0;
        diskBar.style.width = `${activityPct}%`;

        if (activityPct > 0.5) diskBar.classList.add('pulse');
        else diskBar.classList.remove('pulse');

        diskVal.title = `Space: ${stats.disk.used_gb.toFixed(1)} / ${stats.disk.total_gb.toFixed(1)} GB`;
    }

    // Network (Show activity)
    if (stats.network && netVal && netBar) {
        const downRate = stats.network.download_rate || 0;
        const upRate = stats.network.upload_rate || 0;

        const fmtNet = (bytes) => {
             const mb = bytes / (1024 * 1024);
             return `${mb.toFixed(1)} MB/s`;
        };

        netVal.innerText = `↓${fmtNet(downRate)}  ↑${fmtNet(upRate)}`;

        // Dynamic progress bar from backend
        const netPct = stats.network.activity_percent || 0;
        netBar.style.width = `${netPct}%`;

        if (netPct > 0.5) netBar.classList.add('pulse');
        else netBar.classList.remove('pulse');
    }
}

function setLoadingState() {
    const ids = ['cpu-percent', 'gpu-util', 'ram-percent', 'gpu-memory', 'disk-usage', 'network-status'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "Waiting...";
    });
}

function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
