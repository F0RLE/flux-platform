
// Enhanced Toast System
let toastQueue = [];
function showToast(message, type = 'info', duration = 3000, title = null) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    toast.innerHTML = `
                <div class="toast-content">
                    ${title ? `<div class="toast-title">${title}</div>` : ''}
                    <div class="toast-message">${message}</div>
                </div>
            `;

    container.appendChild(toast);
    toastQueue.push(toast);

    setTimeout(() => {
        toast.classList.add('leaving');
        setTimeout(() => {
            toast.remove();
            toastQueue = toastQueue.filter(t => t !== toast);
        }, 300);
    }, duration);
}

// Action Feedback
function showActionFeedback(type = 'success') {
    let feedback = document.getElementById('action-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'action-feedback';
        feedback.id = 'action-feedback';
        feedback.innerHTML = '<div class="action-feedback-icon"></div>';
        document.body.appendChild(feedback);
    }

    feedback.className = `action-feedback ${type}`;
    const iconElement = feedback.querySelector('.action-feedback-icon');
    if (iconElement) {
        iconElement.textContent = '';
    }
    feedback.classList.add('show');

    setTimeout(() => {
        feedback.classList.remove('show');
    }, 600);
}

// Skeleton Loaders
function showSkeletonLoaders(containerId, count = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;

    for (let i = 1; i <= count; i++) {
        const skeleton = document.getElementById(`${containerId}-skeleton-${i}`);
        if (skeleton) {
            skeleton.style.display = 'block';
        }
    }
}

function hideSkeletonLoaders(containerId, count = 3) {
    for (let i = 1; i <= count; i++) {
        const skeleton = document.getElementById(`${containerId}-skeleton-${i}`);
        if (skeleton) {
            skeleton.style.display = 'none';
        }
    }
}

// Button Loading State
function setButtonLoading(button, loading = true) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}


window.showPromptTab = function (tab, btn) {
    document.querySelectorAll('.prompt-tab-content').forEach(t => t.style.display = 'none');
    const targetTab = document.getElementById('prompt-tab-' + tab);
    if (targetTab) {
        targetTab.style.display = 'block';
    }
    if (btn && btn.parentElement) {
        btn.parentElement.querySelectorAll('button').forEach(b => {
            b.style.background = 'var(--surface)';
            b.style.color = 'var(--text-secondary)';
        });
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
    }
};

function updateTokenCount() {
    const text = document.getElementById('field-llm-sys')?.value || '';
    const count = Math.floor(text.length / 4);
    const el = document.getElementById('token-count-sys');
    if (el) el.innerText = count;
}
// Add event listener after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const sysField = document.getElementById('field-llm-sys');
    if (sysField) {
        sysField.addEventListener('input', updateTokenCount);
    }
    // Update status indicator periodically
    setInterval(updateDiagnostics, 5000);
    updateDiagnostics();
});

async function updateDiagnostics() {
    try {
        const res = await fetch('/api/state');
        const data = await res.json();
        const services = data.services || {};
        const allRunning = Object.values(services).every(s => s === 'running');
        const anyError = Object.values(services).some(s => s === 'error');

        const statusEl = document.getElementById('diag-status');
        if (statusEl) {
            let statusClass = 'ok';
            let statusText = t('ui.launcher.diagnostics.status_ok', 'OK');
            if (anyError) {
                statusClass = 'error';
                statusText = t('ui.launcher.status.error', 'Ошибка');
            } else if (!allRunning || Object.keys(services).length === 0) {
                statusClass = 'warning';
                statusText = t('ui.launcher.diagnostics.status_warning', 'Предупреждение');
            }
            statusEl.innerHTML = `<span class="status-indicator-live ${statusClass}"></span><span>${statusText}</span>`;
        }
    } catch (e) {
        console.error("Failed to update diagnostics:", e);
    }
}

window.applyPreset = function (name) {
    const presets = {
        portrait: { w: 896, h: 1152, s: 30, c: 7.0 },
        landscape: { w: 1152, h: 896, s: 30, c: 7.0 },
        telegram: { w: 1024, h: 1024, s: 25, c: 6.5 }
    };
    const p = presets[name];
    if (p) {
        document.getElementById('field-sd-w').value = p.w;
        document.getElementById('field-sd-h').value = p.h;
        document.getElementById('field-sd-steps').value = p.s;
        document.getElementById('field-sd-cfg').value = p.c;
        document.getElementById('val-sd-steps').innerText = p.s;
        document.getElementById('val-sd-cfg').innerText = p.c.toFixed(1);
        saveSetting('sd_width', p.w, true);
        saveSetting('sd_height', p.h, true);
        saveSetting('sd_steps', p.s, true);
        saveSetting('sd_cfg', p.c, true);
    }
};

window.setAspect = function (w, h) {
    document.getElementById('field-sd-w').value = w;
    document.getElementById('field-sd-h').value = h;
    saveSetting('sd_width', w, true);
    saveSetting('sd_height', h, true);
}

function toggleAdZones() {
    const enabled = document.getElementById('field-ad-enabled').checked;
    document.querySelectorAll('.ad-zone-card input[type="checkbox"], .ad-zone-card input[type="range"]').forEach(el => {
        el.disabled = !enabled;
    });
}
