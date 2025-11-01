// Advanced Animations for Student Page

// Initialize animations on page load
document.addEventListener('DOMContentLoaded', function() {
    initializePageAnimations();
    addScrollAnimations();
    addHoverEffects();
});

// Initialize page animations
function initializePageAnimations() {
    // Animate cards on load
    const cards = document.querySelectorAll('.student-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 * index);
    });
}

// Add scroll animations
function addScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });
    
    // Observe all animated elements
    const animatedElements = document.querySelectorAll('[data-animate]');
    animatedElements.forEach(el => observer.observe(el));
}

// Add hover effects
function addHoverEffects() {
    // Card tilt effect on mouse move
    const cards = document.querySelectorAll('.student-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', handleCardTilt);
        card.addEventListener('mouseleave', resetCardTilt);
    });
}

// Handle card tilt on mouse move
function handleCardTilt(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
}

// Reset card tilt
function resetCardTilt(e) {
    const card = e.currentTarget;
    card.style.transform = '';
}

// Enhanced button click animation
function addButtonClickAnimation(button) {
    button.addEventListener('click', function(e) {
        // Scale animation
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = '';
        }, 150);
    });
}

// Apply to all buttons
document.querySelectorAll('.student-btn').forEach(addButtonClickAnimation);

// Typing animation for text
function typeText(element, text, speed = 50) {
    let index = 0;
    element.textContent = '';
    
    const interval = setInterval(() => {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
        } else {
            clearInterval(interval);
        }
    }, speed);
}

// Shake animation for errors
function shakeElement(element) {
    element.style.animation = 'shake 0.5s';
    setTimeout(() => {
        element.style.animation = '';
    }, 500);
}

// Add shake animation to CSS
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
        20%, 40%, 60%, 80% { transform: translateX(10px); }
    }
`;
document.head.appendChild(shakeStyle);

// Pulse animation for important elements
function pulseElement(element) {
    element.style.animation = 'pulse-scale 1s ease-in-out';
    setTimeout(() => {
        element.style.animation = '';
    }, 1000);
}

// Add pulse-scale animation to CSS
const pulseScaleStyle = document.createElement('style');
pulseScaleStyle.textContent = `
    @keyframes pulse-scale {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
`;
document.head.appendChild(pulseScaleStyle);

// Progress circle animation
function animateProgress(element, targetValue, duration = 1000) {
    let startValue = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentValue = startValue + (targetValue - startValue) * easeOutCubic(progress);
        element.textContent = Math.round(currentValue);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Easing function
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// Floating animation for icons
function addFloatingAnimation(element) {
    element.style.animation = 'float 3s ease-in-out infinite';
}

// Add floating animation CSS
const floatingStyle = document.createElement('style');
floatingStyle.textContent = `
    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
    }
`;
document.head.appendChild(floatingStyle);

// Apply floating to header icon
const headerIcon = document.querySelector('.student-header-icon');
if (headerIcon) {
    addFloatingAnimation(headerIcon);
}

// Gradient shift animation for buttons
function addGradientShift(element) {
    element.style.backgroundSize = '200% 200%';
    element.style.animation = 'gradientShift 3s ease infinite';
}

// Add gradient shift CSS
const gradientShiftStyle = document.createElement('style');
gradientShiftStyle.textContent = `
    @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
`;
document.head.appendChild(gradientShiftStyle);

// Spotlight effect on hover
function addSpotlightEffect(element) {
    element.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.style.setProperty('--spotlight-x', `${x}px`);
        this.style.setProperty('--spotlight-y', `${y}px`);
    });
}

// Add spotlight CSS
const spotlightStyle = document.createElement('style');
spotlightStyle.textContent = `
    .student-card::after {
        content: '';
        position: absolute;
        top: var(--spotlight-y, 50%);
        left: var(--spotlight-x, 50%);
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%);
        transform: translate(-50%, -50%);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .student-card:hover::after {
        opacity: 1;
    }
`;
document.head.appendChild(spotlightStyle);

// Apply spotlight to cards
document.querySelectorAll('.student-card').forEach(addSpotlightEffect);

// Morph animation between sections
function morphSection(fromElement, toElement) {
    fromElement.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    fromElement.style.opacity = '0';
    fromElement.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
        fromElement.classList.add('hidden');
        toElement.classList.remove('hidden');
        toElement.style.opacity = '0';
        toElement.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            toElement.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            toElement.style.opacity = '1';
            toElement.style.transform = 'scale(1)';
        }, 50);
    }, 500);
}

// Counter animation for numbers
function animateCounter(element, target, duration = 2000) {
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, 16);
}

// Particle burst effect
function createParticleBurst(x, y, count = 20) {
    const colors = ['#667eea', '#764ba2', '#56ab2f', '#a8e6cf'];
    
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        const angle = (Math.PI * 2 * i) / count;
        const velocity = 2 + Math.random() * 2;
        
        particle.style.cssText = `
            position: fixed;
            width: 8px;
            height: 8px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            border-radius: 50%;
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            z-index: 9999;
        `;
        
        document.body.appendChild(particle);
        
        const animation = particle.animate([
            { 
                transform: 'translate(0, 0) scale(1)', 
                opacity: 1 
            },
            { 
                transform: `translate(${Math.cos(angle) * 100 * velocity}px, ${Math.sin(angle) * 100 * velocity}px) scale(0)`, 
                opacity: 0 
            }
        ], {
            duration: 1000,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        });
        
        animation.onfinish = () => particle.remove();
    }
}

// Success celebration animation
function celebrateSuccess() {
    // Confetti
    createConfetti();
    
    // Particle burst at center
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    createParticleBurst(centerX, centerY, 30);
    
    // Play success sound (if audio is enabled)
    playSuccessSound();
}

// Play success sound
function playSuccessSound() {
    // Create a simple beep sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        // Audio not supported or blocked
        console.log('Audio playback not available');
    }
}

// Export functions for use in main script
window.studentAnimations = {
    shakeElement,
    pulseElement,
    animateProgress,
    animateCounter,
    createParticleBurst,
    celebrateSuccess,
    morphSection
};

