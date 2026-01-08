// Global chat input handler
// Defined in a separate non-module file to guarantee global scope availability
// regardless of module loading timing.

window.handleChatKey = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // STOP Default Newline
        e.stopPropagation();

        // Try to find send button or call global function
        const btn = document.getElementById('chat-send');
        if (btn) {
            // Force click (simulated)
            btn.click();
        } else if (typeof window.sendChat === 'function') {
            window.sendChat();
        }

        // Reset height
        setTimeout(() => {
            const el = e.target;
            if (el) {
                el.style.height = 'auto';
                el.value = ''; // Ensure clear visually if JS lags
            }
        }, 10);
        return false;
    }
    return true;
};
