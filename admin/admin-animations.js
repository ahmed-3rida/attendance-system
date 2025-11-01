/* ============================================
   ENHANCED ADMIN PANEL ANIMATIONS & EFFECTS
   ============================================ */

// Initialize enhanced features when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing enhanced admin animations...');
    
    try {
        initializeEnhancedUI();
        addFloatingParticles();
        enhanceNotifications();
        addButtonRippleEffects();
        addCardAnimations();
        addTableAnimations();
        initializeScrollAnimations();
        addPageTransitions();
        
        console.log('Enhanced admin animations initialized successfully');
    } catch (error) {
        console.error('Error initializing enhanced animations:', error);
    }
});

// Initialize Enhanced UI Elements
function initializeEnhancedUI() {
    // Add loading screen
    addLoadingScreen();
    
    // Hide loading screen after content is loaded
    window.addEventListener('load', function() {
        setTimeout(() => {
            const loadingScreen = document.querySelector('.loading-screen');
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                loadingScreen.style.pointerEvents = 'none';
                setTimeout(() => loadingScreen.remove(), 500);
            }
        }, 1000);
    });
    
    // Add smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            // Skip if href is just "#" or empty
            if (!href || href === '#' || href.length <= 1) {
                return;
            }
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Add Loading Screen
function addLoadingScreen() {
    const loadingHTML = `
        <div class="loading-screen">
            <div class="text-center">
                <div class="spinner-modern mb-3"></div>
                <h4 class="text-white">جاري التحميل...</h4>
                <p class="text-white-50">الرجاء الانتظار</p>
            </div>
        </div>
    `;
    
    if (!document.querySelector('.loading-screen')) {
        document.body.insertAdjacentHTML('afterbegin', loadingHTML);
    }
}

// Add Floating Particles
function addFloatingParticles() {
    const particleCount = 15;
    const colors = ['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)', 'rgba(86, 171, 47, 0.1)'];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'floating-particle';
        particle.style.cssText = `
            position: fixed;
            width: ${Math.random() * 6 + 3}px;
            height: ${Math.random() * 6 + 3}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            border-radius: 50%;
            left: ${Math.random() * 100}vw;
            top: ${Math.random() * 100}vh;
            pointer-events: none;
            z-index: 1;
            opacity: 0.5;
            animation: floatParticle ${Math.random() * 10 + 10}s ease-in-out infinite;
        `;
        
        document.body.appendChild(particle);
    }
    
    // Add particle animation
    const particleStyle = document.createElement('style');
    particleStyle.textContent = `
        @keyframes floatParticle {
            0%, 100% {
                transform: translate(0, 0);
            }
            25% {
                transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px);
            }
            50% {
                transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px);
            }
            75% {
                transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px);
            }
        }
    `;
    document.head.appendChild(particleStyle);
}

// Enhanced Notification System
function enhanceNotifications() {
    // Override the existing showNotification function
    const originalShowNotification = window.showNotification;
    
    window.showNotification = function(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification-modern ${type} slide-in-left`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            danger: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            danger: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${icons[type] || icons.info} me-3" style="font-size: 1.5rem; color: ${colors[type] || colors.info};"></i>
                <div class="flex-grow-1">
                    <strong>${type === 'success' ? 'نجح!' : type === 'error' || type === 'danger' ? 'خطأ!' : 'تنبيه'}</strong>
                    <p class="mb-0 mt-1">${message}</p>
                </div>
                <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutLeft 0.5s ease-in forwards';
            setTimeout(() => notification.remove(), 500);
        }, 5000);
        
        // Add slide out animation
        const slideOutStyle = document.createElement('style');
        slideOutStyle.textContent = `
            @keyframes slideOutLeft {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(-100%); opacity: 0; }
            }
        `;
        if (!document.querySelector('#slideOutStyle')) {
            slideOutStyle.id = 'slideOutStyle';
            document.head.appendChild(slideOutStyle);
        }
    };
}

// Add Button Ripple Effects
function addButtonRippleEffects() {
    document.addEventListener('click', function(e) {
        const button = e.target.closest('.btn, .btn-modern');
        if (!button) return;
        
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            transform: scale(0);
            animation: rippleEffect 0.6s ease-out;
            pointer-events: none;
        `;
        
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
    
    // Add ripple animation
    const rippleStyle = document.createElement('style');
    rippleStyle.textContent = `
        @keyframes rippleEffect {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(rippleStyle);
}

// Add Card Animations
function addCardAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('fade-in');
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    
    document.querySelectorAll('.card, .stat-card, .card-modern').forEach(card => {
        observer.observe(card);
    });
}

// Add Table Animations
function addTableAnimations() {
    const tables = document.querySelectorAll('table tbody tr');
    tables.forEach((row, index) => {
        row.style.animationDelay = `${index * 0.05}s`;
    });
}

// Initialize Scroll Animations
function initializeScrollAnimations() {
    const scrollElements = document.querySelectorAll('[data-animate]');
    
    const elementInView = (el, percentageScroll = 100) => {
        const elementTop = el.getBoundingClientRect().top;
        return (
            elementTop <= 
            (window.innerHeight || document.documentElement.clientHeight) * (percentageScroll/100)
        );
    };
    
    const displayScrollElement = (element) => {
        element.classList.add('scrolled');
    };
    
    const handleScrollAnimation = () => {
        scrollElements.forEach((el) => {
            if (elementInView(el, 100)) {
                displayScrollElement(el);
            }
        });
    };
    
    window.addEventListener('scroll', handleScrollAnimation);
    handleScrollAnimation(); // Initial check
}

// Add Page Transitions
function addPageTransitions() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.classList.add('fade-in');
    }
}

// Confetti Effect (for success actions)
function createConfetti(element = document.body) {
    const colors = ['#667eea', '#764ba2', '#56ab2f', '#a8e6cf', '#ffd700', '#ff69b4'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed;
            width: ${Math.random() * 10 + 5}px;
            height: ${Math.random() * 10 + 5}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}vw;
            top: -20px;
            opacity: ${Math.random() * 0.7 + 0.3};
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            animation: confettiFall ${Math.random() * 3 + 2}s linear forwards;
            z-index: 9999;
            pointer-events: none;
        `;
        
        element.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

// Add confetti animation
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
    @keyframes confettiFall {
        to {
            transform: translateY(100vh) rotate(${Math.random() * 360}deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(confettiStyle);

// Enhanced Input Focus Effects
function addEnhancedInputEffects() {
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('input-focused');
            
            // Add glow effect
            this.style.animation = 'glowPulse 1.5s ease-in-out infinite';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('input-focused');
            this.style.animation = '';
        });
    });
}

// Call after DOM updates
setTimeout(addEnhancedInputEffects, 1000);

// Counter Animation for Stats
function animateCounter(element, target, duration = 1000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    const updateCounter = () => {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start);
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target;
        }
    };
    
    updateCounter();
}

// Observe stat cards and animate counters when visible
function initializeCounterAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const value = entry.target.querySelector('.stat-value');
                if (value && !value.dataset.animated) {
                    const target = parseInt(value.textContent);
                    if (!isNaN(target)) {
                        value.dataset.animated = 'true';
                        animateCounter(value, target);
                    }
                }
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    document.querySelectorAll('.stat-card').forEach(card => {
        observer.observe(card);
    });
}

// Call after stats are loaded
setTimeout(initializeCounterAnimations, 2000);

// Add Smooth Hover Effects to Cards
function addCardHoverEffects() {
    document.querySelectorAll('.card, .card-modern, .stat-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
}

setTimeout(addCardHoverEffects, 1000);

// Progress Bar Animation
function animateProgressBar(progressBar, percentage) {
    progressBar.style.width = '0%';
    setTimeout(() => {
        progressBar.style.transition = 'width 1s ease-out';
        progressBar.style.width = percentage + '%';
    }, 100);
}

// Floating Action Button (FAB)
function addFloatingActionButton() {
    const fab = document.createElement('div');
    fab.className = 'fab';
    fab.innerHTML = '<i class="fas fa-arrow-up"></i>';
    fab.style.display = 'none';
    fab.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    
    document.body.appendChild(fab);
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            fab.style.display = 'flex';
        } else {
            fab.style.display = 'none';
        }
    });
}

addFloatingActionButton();

// Export functions for use in main admin.js
window.createConfetti = createConfetti;
window.animateCounter = animateCounter;
window.animateProgressBar = animateProgressBar;
window.addEnhancedInputEffects = addEnhancedInputEffects;
window.initializeCounterAnimations = initializeCounterAnimations;

console.log('✨ Enhanced admin animations loaded successfully');

