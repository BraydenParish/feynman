// Animation System
export class AnimationSystem {
    constructor() {
        this.particles = [];
        this.container = document.getElementById('particles-container');
    }
    
    createParticle(x, y, color) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.backgroundColor = color;
        this.container.appendChild(particle);
        return particle;
    }
    
    async correctAnswerAnimation(element) {
        const rect = element.getBoundingClientRect();
        const particles = [];
        
        for (let i = 0; i < 15; i++) {
            const particle = this.createParticle(
                rect.left + Math.random() * rect.width,
                rect.top + Math.random() * rect.height,
                '#28a745'
            );
            particles.push(particle);
        }
        
        await this.animateParticles(particles);
    }
    
    async animateParticles(particles) {
        const animations = particles.map(particle => {
            const angle = Math.random() * Math.PI * 2;
            const velocity = 1 + Math.random() * 2;
            const distance = 30 + Math.random() * 50;
            
            return new Promise(resolve => {
                const startX = parseFloat(particle.style.left);
                const startY = parseFloat(particle.style.top);
                let progress = 0;
                
                const animate = () => {
                    progress += 0.05;
                    if (progress >= 1) {
                        particle.remove();
                        resolve();
                        return;
                    }
                    
                    const x = startX + Math.cos(angle) * distance * progress;
                    const y = startY + Math.sin(angle) * distance * progress;
                    particle.style.left = `${x}px`;
                    particle.style.top = `${y}px`;
                    particle.style.opacity = 1 - progress;
                    
                    requestAnimationFrame(animate);
                };
                
                requestAnimationFrame(animate);
            });
        });
        
        await Promise.all(animations);
    }
    
    createFireworks() {
        const fireworksContainer = document.querySelector('.fireworks');
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const firework = document.createElement('div');
                firework.className = 'firework';
                firework.style.left = `${Math.random() * 100}%`;
                firework.style.top = `${Math.random() * 100}%`;
                fireworksContainer.appendChild(firework);
                
                setTimeout(() => firework.remove(), 800);
            }, i * 200);
        }
    }
    
    shakeScreen() {
        document.body.classList.add('shake');
        setTimeout(() => {
            document.body.classList.remove('shake');
        }, 500);
    }
    
    pulseElement(element) {
        element.classList.add('pulse');
        setTimeout(() => {
            element.classList.remove('pulse');
        }, 500);
    }
} 