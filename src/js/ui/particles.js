class CyberpunkParticles {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        document.body.appendChild(this.canvas);

        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none'; // Click-through
        this.canvas.style.zIndex = '-1'; // Behind everything
        // this.canvas.style.filter = 'blur(4px)'; // Removed for performance, low-res provides natural blur

        this.particles = [];
        this.mouse = { x: -100, y: -100 };

        // Use actual screen size + 20% buffer instead of forcing 4K, to save GPU on smaller screens
        const sW = window.screen.width;
        const sH = window.screen.height;
        const maxDim = Math.max(sW, sH) * 1.2;
        this.width = maxDim;
        this.height = maxDim;

        // Render at half resolution for performance (blurry/dreamy look fits the style)
        this.canvas.width = this.width * 0.5;
        this.canvas.height = this.height * 0.5;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';

        // Scale context to match coordinate system
        this.ctx.scale(0.5, 0.5);

        this.init();

        // Resize listener removed to keep particles static
        // window.addEventListener('resize', () => this.resize());

        this.isRunning = false;

        // Optimization: Pause animation when window is hidden or lost focus
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stop();
            } else {
                this.start();
            }
        });

        window.addEventListener('blur', () => this.stop());
        window.addEventListener('focus', () => this.start());

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        this.start();
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }

    stop() {
        this.isRunning = false;
    }

    resize() {
        // Dynamic resize removed to prevent particle shifting/regeneration
        // Canvas is now fixed size (initialized in constructor)
    }

    init() {
        // Create particles
        // Reduced density for better performance (was 15000)
        const particleCount = Math.floor((this.width * this.height) / 30000);
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.2, // Slower speed
                vy: (Math.random() - 0.5) * 0.2,
                size: Math.random() * 2 + 0.5,
                color: Math.random() > 0.5 ? 'rgba(138, 43, 226, 0.3)' : 'rgba(93, 220, 255, 0.3)' // Primary & Cyan
            });
        }
    }

    animate() {
        if (!this.isRunning) return;

        // FPS Throttling
        // Limit to 20 FPS (1000ms / 20 = 50ms)
        const now = Date.now();
        if (!this.lastFrameTime) this.lastFrameTime = now;
        const elapsed = now - this.lastFrameTime;

        if (elapsed > 50) { // 20 FPS
            this.lastFrameTime = now - (elapsed % 41);

            this.ctx.clearRect(0, 0, this.width, this.height);

            this.particles.forEach(p => {
                // Update position
                p.x += p.vx;
                p.y += p.vy;

                // Mouse interaction (repel)
                const dx = this.mouse.x - p.x;
                const dy = this.mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 150;

                if (dist < maxDist) {
                    const force = (maxDist - dist) / maxDist;
                    const angle = Math.atan2(dy, dx);
                    p.vx -= Math.cos(angle) * force * 0.05;
                    p.vy -= Math.sin(angle) * force * 0.05;
                }

                // Wrap around screen
                if (p.x < 0) p.x = this.width;
                if (p.x > this.width) p.x = 0;
                if (p.y < 0) p.y = this.height;
                if (p.y > this.height) p.y = 0;

                // Draw
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.fill();
            });
        }

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CyberpunkParticles();
});
