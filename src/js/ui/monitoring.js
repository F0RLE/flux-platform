
import { subscribeToSystemStats } from '../events/system.js';

function initMonitoring() {
    console.log("[Monitoring] Initializing...");
    const cpuVal = document.getElementById('cpu-percent');

    if (!cpuVal) {
        console.warn("[Monitoring] DOM not ready or elements missing");
        return;
    }

    subscribeToSystemStats((stats) => {
        // console.log("[Monitoring] Update", stats); // specific debug
        updateUI(stats);
    });
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
        cpuVal.textContent = `${stats.cpu.percent}%`;
        cpuBar.style.width = `${stats.cpu.percent}%`;
    }

    // RAM
    if (stats.ram && ramVal && ramBar) {
        ramVal.textContent = `${stats.ram.percent}%`;
        ramBar.style.width = `${stats.ram.percent}%`;
    }

    // GPU
    if (stats.gpu && gpuVal && gpuBar) {
        gpuVal.textContent = `${stats.gpu.util}%`;
        gpuBar.style.width = `${Math.min(100, stats.gpu.util)}%`;
    }

    // VRAM
    if (stats.vram && vramVal && vramBar) {
        vramVal.textContent = `${stats.vram.percent}%`;
        vramBar.style.width = `${stats.vram.percent}%`;
    }

    // Disk
    if (stats.disk && diskVal && diskBar) {
        diskVal.textContent = `${stats.disk.percent}%`;
        diskBar.style.width = `${stats.disk.percent}%`;
    }

    // Network
    if (stats.network && netVal && netBar) {
        // Mock simple display provided, real one would parse bytes
        const up = formatBytes(stats.network.up);
        const down = formatBytes(stats.network.down);
        netVal.innerText = `↓${down}/s`;
        // Make bar somewhat alive
        netBar.style.width = '50%';
        netBar.classList.add('pulse'); // If pulse class exists
    }
}

function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
