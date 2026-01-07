// Sidebar Logic (Drag & Drop)
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for UI state to load before initializing sidebar
    if (window.uiState) {
        await window.uiState.load();
    }
    initSidebar();
});

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Restore or create drag handle
    let dragHandle = document.getElementById('sidebar-drag-handle');
    if (!dragHandle) {
        dragHandle = document.createElement('div');
        dragHandle.id = 'sidebar-drag-handle';
        sidebar.appendChild(dragHandle);
    }

    // Restore saved width from UI state
    const savedWidth = window.uiState ? window.uiState.getSidebarWidth() : 280;
    const isCollapsed = window.uiState ? window.uiState.getSidebarCollapsed() : false;

    if (isCollapsed) {
        setSidebarWidth(80);
    } else if (savedWidth) {
        setSidebarWidth(savedWidth);
    }

    // Initialize Drag Logic
    initDragResize(sidebar, dragHandle);

    // Initialize Navigation Buttons
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const pageId = btn.getAttribute('data-page');
            if (pageId && typeof window.showPage === 'function') {
                window.showPage(pageId, btn);
            }
        });
    });

    // Initialize Click-to-Collapse on Logo Area
    const logoArea = sidebar.querySelector('.logo-area');
    if (logoArea) {
        logoArea.addEventListener('click', () => {
            const currentWidth = sidebar.getBoundingClientRect().width;
            // If already compact (80px), expand to 280px. Otherwise, collapse to 80px.
            const targetWidth = currentWidth <= 80 ? 280 : 80;
            const isCollapsing = targetWidth === 80;

            // Apply animation class for smooth transition
            document.body.classList.add('snapping');

            setSidebarWidth(targetWidth);

            // Save to UI state
            if (window.uiState) {
                window.uiState.setSidebarWidth(targetWidth);
                window.uiState.setSidebarCollapsed(isCollapsing);
            }

            // Cleanup animation class
            setTimeout(() => {
                document.body.classList.remove('snapping');
            }, 300);
        });

        // Add cursor pointer for UX
        logoArea.style.cursor = 'pointer';
    }
}

function initDragResize(sidebar, handle) {
    let isDragging = false;
    let startX = 0;
    let startWidth = 0;

    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startWidth = sidebar.getBoundingClientRect().width;
        handle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        e.preventDefault(); // Prevent text selection
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const delta = e.clientX - startX;
        let newWidth = startWidth + delta;

        // Constraints
        if (newWidth < 80) newWidth = 80;
        if (newWidth > 600) newWidth = 600;

        setSidebarWidth(newWidth);
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            handle.classList.remove('dragging');
            document.body.style.cursor = '';

            // Save state
            // Snap logic: 2 positions
            const currentWidth = sidebar.getBoundingClientRect().width;
            let finalWidth = 280; // Default Expanded
            let isCollapsed = false;

            // Lower threshold (100px) creates a "bias" towards expanding
            // making it trigger with a "small drag" from compact (80px)
            if (currentWidth < 100) {
                finalWidth = 80; // Compact
                isCollapsed = true;
            }

            // Apply animation class
            document.body.classList.add('snapping');

            setSidebarWidth(finalWidth);

            // Save to UI state
            if (window.uiState) {
                window.uiState.setSidebarWidth(finalWidth);
                window.uiState.setSidebarCollapsed(isCollapsed);
            }

            // Remove animation class after transition
            setTimeout(() => {
                document.body.classList.remove('snapping');
            }, 300);
        }
    });
}

// Set Sidebar Width Function
function setSidebarWidth(width) {
    // Toggle compact class based on width
    const sidebar = document.getElementById('sidebar');
    if (width < 100) { // Threshold for compact mode
        if (!sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
        }
    } else {
        if (sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('collapsed');
        }
    }

    // Always update variable to match actual width for smooth header sync
    document.documentElement.style.setProperty('--sidebar-width', width + 'px');

    // Always update inline width for when we un-collapse
    sidebar.style.width = width + 'px';
}

