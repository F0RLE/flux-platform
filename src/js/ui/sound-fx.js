class SoundFX {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true; // Could be linked to settings
        this.initListeners();
    }

    playTone(freq, type, duration, vol = 0.05) {
        if (!this.enabled) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // Muffle the sound (Low-pass filter)
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime); // Underwater

        // Lower volume
        gain.gain.setValueAtTime(vol * 0.5, this.ctx.currentTime); // Reduce overall volume by half
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // High tech but subtle 'blip' for hover
    playHover() {
        // Very soft shine/triangle wave, muffled
        this.playTone(600, 'sine', 0.05, 0.015);
    }

    // Redesigned 'click' - Underwater/Muffled
    playClick() {
        if (!this.enabled) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const t = this.ctx.currentTime;

        // Single Oscillator: Soft Triangle
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

        // "Underwater" Filter - Very Low Cutoff
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, t); // Deep underwater sound

        // Soft envelope
        gain.gain.setValueAtTime(0.0042, t); // Reduced by 70%
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(t + 0.1);
    }

    // Toggle sound (rising/falling)
    playToggle(state) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        if (state) {
            // Rising pitch (ON)
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(600, now + 0.15);
        } else {
            // Falling pitch (OFF)
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.linearRampToValueAtTime(200, now + 0.15);
        }

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.start();
        osc.stop(now + 0.15);
    }

    initListeners() {
        // Attach to common UI elements
        this.lastHovered = null;

        document.addEventListener('mouseover', (e) => {
            // Use closest to find the main interactive container
            const target = e.target.closest('button, .nav-btn, .toggle, .sidebar-toggle-btn, .taskbar-toggle-item, .monitor-toggle-btn');

            if (target) {
                // Only play if we entered a NEW interactive element
                if (target !== this.lastHovered) {
                    this.playHover();
                    this.lastHovered = target;
                }
            } else {
                // If we are not over any interactive element, reset
                this.lastHovered = null;
            }
        });

        // Reset when mouse leaves window or major sections to prevent stuck state
        document.addEventListener('mouseout', (e) => {
            if (e.relatedTarget === null) {
                this.lastHovered = null;
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (e.target.closest('button, .nav-btn, .toggle, .taskbar-toggle-item, .monitor-toggle-btn')) {
                this.playClick();
            }
        });

        // Listen for specific toggle events if possible, or just rely on click
    }
}

// Initialize
window.soundFX = new SoundFX();
