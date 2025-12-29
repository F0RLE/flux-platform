const { ipcRenderer } = require('electron');

// State
let installPath = '';
let currentScreen = 'welcome';

// Steps data
const STEPS = [
    { id: 'python', name: 'Python Runtime', icon: '🐍' },
    { id: 'pip', name: 'pip Installer', icon: '📦' },
    { id: 'electron', name: 'Electron Runtime', icon: '⚡' },
    { id: 'git', name: 'MinGit', icon: '🔧' },
    { id: 'launcher', name: 'Flux Launcher', icon: '🚀' }
];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    installPath = await ipcRenderer.invoke('get-default-path');
    document.getElementById('install-path').value = installPath;
    renderSteps();
});

// Render steps
function renderSteps() {
    const container = document.getElementById('steps-container');
    container.innerHTML = STEPS.map((step, index) => `
        <div class="step" id="step-${index}">
            <div class="step-icon">${step.icon}</div>
            <div class="step-name">${step.name}</div>
            <div class="step-status" id="step-status-${index}">Ожидание</div>
        </div>
    `).join('');
}

// Screen navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(`screen-${screenId}`).classList.remove('hidden');
    currentScreen = screenId;
}

// Window controls
function minimizeWindow() {
    ipcRenderer.send('window-minimize');
}

function closeWindow() {
    ipcRenderer.send('window-close');
}

// Change path (simplified - in real app would use dialog)
async function changePath() {
    // For now, just show an alert - in production use electron dialog
    alert('В текущей версии путь изменить нельзя.\nУстановка будет в: ' + installPath);
}

// Start installation
async function startInstall() {
    showScreen('progress');

    try {
        const result = await ipcRenderer.invoke('start-install', installPath);

        if (result.success) {
            showScreen('complete');
        } else {
            document.getElementById('error-message').textContent = result.error || 'Неизвестная ошибка';
            showScreen('error');
        }
    } catch (error) {
        document.getElementById('error-message').textContent = error.message;
        showScreen('error');
    }
}

// Retry installation
function retryInstall() {
    // Reset steps
    renderSteps();
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('progress-percent').textContent = '0%';
    document.getElementById('current-action').textContent = 'Подготовка...';

    startInstall();
}

// Finish installation
async function finish() {
    const createShortcut = document.getElementById('create-desktop-shortcut').checked;
    const launchAfter = document.getElementById('launch-after').checked;

    if (createShortcut) {
        await ipcRenderer.invoke('create-shortcuts', {
            installPath,
            desktop: true,
            startMenu: true
        });
    }

    if (launchAfter) {
        await ipcRenderer.invoke('launch-app', installPath);
    }

    closeWindow();
}

// Handle progress updates from main process
ipcRenderer.on('install-progress', (event, progress) => {
    const { step, total, name, status, percent } = progress;

    // Update step states
    for (let i = 0; i < total; i++) {
        const stepEl = document.getElementById(`step-${i}`);
        const statusEl = document.getElementById(`step-status-${i}`);

        if (i < step - 1) {
            // Completed steps
            stepEl.classList.remove('active');
            stepEl.classList.add('done');
            statusEl.textContent = '✓ Готово';
        } else if (i === step - 1) {
            // Current step
            stepEl.classList.add('active');
            stepEl.classList.remove('done');

            if (status === 'downloading') {
                statusEl.textContent = `Загрузка ${percent}%`;
            } else if (status === 'extracting') {
                statusEl.textContent = 'Распаковка...';
            } else if (status === 'configuring') {
                statusEl.textContent = 'Настройка...';
            } else if (status === 'installing') {
                statusEl.textContent = 'Установка...';
            } else if (status === 'done') {
                statusEl.textContent = '✓ Готово';
                stepEl.classList.remove('active');
                stepEl.classList.add('done');
            }
        } else {
            // Pending steps
            stepEl.classList.remove('active', 'done');
            statusEl.textContent = 'Ожидание';
        }
    }

    // Update progress bar
    const overallPercent = Math.round(((step - 1) / total + (percent / 100) / total) * 100);
    document.getElementById('progress-fill').style.width = `${overallPercent}%`;
    document.getElementById('progress-percent').textContent = `${overallPercent}%`;

    // Update current action text
    let actionText = name;
    if (status === 'downloading') {
        actionText = `Загрузка ${name}...`;
    } else if (status === 'extracting') {
        actionText = `Распаковка ${name}...`;
    } else if (status === 'configuring') {
        actionText = `Настройка ${name}...`;
    } else if (status === 'installing') {
        actionText = `Установка зависимостей...`;
    }
    document.getElementById('current-action').textContent = actionText;
});
