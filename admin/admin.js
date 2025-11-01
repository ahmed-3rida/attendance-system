// Admin Panel JavaScript with Modern Features
let currentAdmin = null;
let subjects = [];
let lectures = [];
let doctors = [];
let qrTimer = null;

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel DOM loaded, initializing...');
    
    try {
        initializeTheme();
        initializeEventListeners();
        checkAdminSession();
        console.log('Admin panel initialized successfully');
    } catch (error) {
        console.error('Error initializing admin panel:', error);
    }
});

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('admin-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('admin-theme', newTheme);
    updateThemeIcon(newTheme);
    
    showNotification(`تم التبديل إلى الوضع ${newTheme === 'dark' ? 'الليلي' : 'الصباحي'}`, 'success');
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// Toggle Password Visibility
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('passwordToggleIcon');
    
    if (passwordInput && toggleIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.className = 'fas fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            toggleIcon.className = 'fas fa-eye';
        }
    }
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 1050;
        min-width: 300px;
        animation: slideInRight 0.5s ease-out;
    `;
    
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Navigation
    document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab(this.getAttribute('data-tab'));
        });
    });
}

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showError('يرجى إدخال جميع البيانات المطلوبة');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            currentAdmin = data.admin;
            showDashboard();
            showNotification('تم تسجيل الدخول بنجاح', 'success');
        } else {
            showError(data.message || 'خطأ في تسجيل الدخول');
        }
    } catch (error) {
        hideLoading();
        console.error('Login error:', error);
        showError('خطأ في الاتصال بالخادم');
    }
}

// Session Management
async function checkAdminSession() {
    try {
        const response = await fetch('/api/admin/check', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.authenticated) {
            currentAdmin = data.admin;
            console.log('Session check - authenticated as:', currentAdmin);
            showDashboard();
        } else {
            console.log('Session check - not authenticated');
            showLogin();
        }
    } catch (error) {
        console.error('Session check error:', error);
        showLogin();
    }
}

// UI Management
function showLogin() {
    const loadingScreen = document.getElementById('loadingScreen');
    const loginContainer = document.getElementById('loginContainer');
    const dashboardContainer = document.getElementById('dashboardContainer');
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (loginContainer) loginContainer.style.display = 'block';
    if (dashboardContainer) dashboardContainer.style.display = 'none';
}

function showDashboard() {
    const loadingScreen = document.getElementById('loadingScreen');
    const loginContainer = document.getElementById('loginContainer');
    const dashboardContainer = document.getElementById('dashboardContainer');
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (loginContainer) loginContainer.style.display = 'none';
    if (dashboardContainer) dashboardContainer.style.display = 'block';
    
    // Set user info and role-based UI
    updateUserInfo();
    setupRoleBasedUI();
    loadDashboardData();
}

function updateUserInfo() {
    if (currentAdmin) {
        document.getElementById('userName').textContent = currentAdmin.full_name || currentAdmin.username;
        document.getElementById('userRole').textContent = currentAdmin.role === 'super_admin' ? 'مدير عام' : 'دكتور';
        
        // Update avatar
        const avatar = document.getElementById('userAvatar');
        avatar.innerHTML = `<i class="fas fa-${currentAdmin.role === 'super_admin' ? 'crown' : 'user-md'}"></i>`;
    }
}

function setupRoleBasedUI() {
    const body = document.body;
    
    console.log('Setting up role-based UI:', currentAdmin);
    
    // Remove existing role classes
    body.classList.remove('role-super_admin', 'role-doctor');
    
    // Add appropriate role class
    if (currentAdmin && currentAdmin.role) {
        body.classList.add(`role-${currentAdmin.role}`);
        console.log(`Added role class: role-${currentAdmin.role}`);
        
        // Also check if elements are visible after a small delay
        setTimeout(() => {
            const superAdminElements = document.querySelectorAll('.super-admin-only');
            console.log(`Found ${superAdminElements.length} super-admin-only elements`);
            console.log('Body classes:', body.className);
        }, 100);
    } else {
        console.log('No currentAdmin or role found');
        console.log('currentAdmin:', currentAdmin);
    }
}

// Tab Management
function switchTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update page title
    const titles = {
        dashboard: 'الرئيسية',
        doctors: 'إدارة الدكاترة',
        levels: 'إدارة المراحل',
        subjects: 'إدارة المواد',
        lectures: 'إدارة المحاضرات',
        attendance: 'الإحصائيات',
        students: 'إدارة الطلاب',
        settings: 'الإعدادات',
        profile: 'البروفايل'
    };
    document.getElementById('pageTitle').textContent = titles[tabName] || '';
    
    // Show appropriate tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    const targetTab = document.getElementById(`${tabName}Tab`);
    if (targetTab) {
        targetTab.classList.remove('hidden');
        targetTab.classList.add('fade-in');
        
        // Load tab-specific data
        loadTabData(tabName);
    }
}

// Load tab-specific data
async function loadTabData(tabName) {
    switch (tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'doctors':
            if (currentAdmin?.role === 'super_admin') {
                await loadDoctors();
            }
            break;
        case 'levels':
            if (currentAdmin?.role === 'super_admin') {
                await loadLevels();
            }
            break;
        case 'subjects':
            if (currentAdmin?.role === 'super_admin') {
                await loadSubjects();
            }
            break;
        case 'lectures':
            await loadLectures();
            break;
        case 'attendance':
            await loadAttendanceStats();
            break;
        case 'students':
            await loadStudents();
            break;
        case 'settings':
            await loadSettings();
            break;
        case 'profile':
            await loadProfileData();
            break;
    }
}

// Dashboard Data Loading - Modern Redesign
async function loadDashboardData() {
    const dashboardTab = document.getElementById('dashboardTab');
    const isSuperAdmin = currentAdmin?.role === 'super_admin';
    
    try {
        const response = await fetch('/api/admin/statistics/overview', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            const stats = data.overview;
            
            // Render modern dashboard
            dashboardTab.innerHTML = `
                <!-- Welcome Header -->
                <div class="dashboard-header">
                    <div class="dashboard-welcome">
                        <h2 class="dashboard-title">
                            <span class="wave-emoji">👋</span>
                            مرحباً، ${currentAdmin?.full_name || currentAdmin?.username}
                        </h2>
                        <p class="dashboard-subtitle">إليك نظرة عامة على نظام الحضور</p>
                    </div>
                    <div class="dashboard-date">
                        <i class="fas fa-calendar-alt me-2"></i>
                        <span>${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="dashboard-stats-grid">
                    ${isSuperAdmin ? `
                        <div class="dashboard-stat-card dashboard-stat-primary">
                            <div class="dashboard-stat-icon">
                                <i class="fas fa-user-tie"></i>
                            </div>
                            <div class="dashboard-stat-content">
                                <div class="dashboard-stat-value" data-count="${stats.total_doctors || 0}">0</div>
                                <div class="dashboard-stat-label">إجمالي الدكاترة</div>
                            </div>
                            <div class="dashboard-stat-bg">
                                <i class="fas fa-user-tie"></i>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="dashboard-stat-card dashboard-stat-success">
                        <div class="dashboard-stat-icon">
                            <i class="fas fa-book-reader"></i>
                        </div>
                        <div class="dashboard-stat-content">
                            <div class="dashboard-stat-value" data-count="${stats.total_subjects || 0}">0</div>
                            <div class="dashboard-stat-label">إجمالي المواد</div>
                        </div>
                        <div class="dashboard-stat-bg">
                            <i class="fas fa-book-reader"></i>
                        </div>
                    </div>
                    
                    <div class="dashboard-stat-card dashboard-stat-warning">
                        <div class="dashboard-stat-icon">
                            <i class="fas fa-chalkboard-teacher"></i>
                        </div>
                        <div class="dashboard-stat-content">
                            <div class="dashboard-stat-value" data-count="${stats.total_lectures || 0}">0</div>
                            <div class="dashboard-stat-label">إجمالي المحاضرات</div>
                        </div>
                        <div class="dashboard-stat-bg">
                            <i class="fas fa-chalkboard-teacher"></i>
                        </div>
                    </div>
                    
                    <div class="dashboard-stat-card dashboard-stat-info">
                        <div class="dashboard-stat-icon">
                            <i class="fas fa-user-check"></i>
                        </div>
                        <div class="dashboard-stat-content">
                            <div class="dashboard-stat-value" data-count="${stats.total_attendance_records || 0}">0</div>
                            <div class="dashboard-stat-label">إجمالي الحضور</div>
                        </div>
                        <div class="dashboard-stat-bg">
                            <i class="fas fa-user-check"></i>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions & Recent Activity -->
                <div class="dashboard-content-grid">
                    <!-- Quick Actions -->
                    <div class="dashboard-panel">
                        <div class="dashboard-panel-header">
                            <h5><i class="fas fa-bolt me-2"></i>إجراءات سريعة</h5>
                        </div>
                        <div class="dashboard-panel-body">
                            <div class="quick-actions-grid" id="quickActionsGrid">
                                <!-- Quick actions will be loaded here -->
                            </div>
                        </div>
                    </div>

                    <!-- Recent Activity -->
                    <div class="dashboard-panel">
                        <div class="dashboard-panel-header">
                            <h5><i class="fas fa-clock me-2"></i>الأنشطة الأخيرة</h5>
                        </div>
                        <div class="dashboard-panel-body">
                            <div id="recentActivity">
                                <div class="text-center py-4">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">جاري التحميل...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Animate counters
            document.querySelectorAll('.dashboard-stat-value[data-count]').forEach(element => {
                const target = parseInt(element.getAttribute('data-count'));
                animateCounter(element, target, 1500);
            });
            
            // Load quick actions
            loadQuickActions();
            
            // Load recent activity
            loadRecentActivity();
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        dashboardTab.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                خطأ في تحميل بيانات لوحة التحكم
            </div>
        `;
    }
}

// Load Quick Actions
function loadQuickActions() {
    const container = document.getElementById('quickActionsGrid');
    const isSuperAdmin = currentAdmin?.role === 'super_admin';
    
    let actions = [];
    
    if (isSuperAdmin) {
        actions = [
            {
                icon: 'fa-user-plus',
                title: 'إضافة دكتور',
                color: 'primary',
                action: 'showCreateDoctorModal()'
            },
            {
                icon: 'fa-book-medical',
                title: 'إضافة مادة',
                color: 'success',
                action: 'showCreateSubjectModal()'
            },
            {
                icon: 'fa-layer-group',
                title: 'إضافة مرحلة',
                color: 'info',
                action: 'showCreateLevelModal()'
            },
            {
                icon: 'fa-chart-line',
                title: 'الإحصائيات',
                color: 'warning',
                action: 'switchTab(\'attendance\')'
            }
        ];
    } else {
        actions = [
            {
                icon: 'fa-plus-circle',
                title: 'إضافة محاضرة',
                color: 'primary',
                action: 'switchTab(\'lectures\')'
            },
            {
                icon: 'fa-list-check',
                title: 'إدارة المحاضرات',
                color: 'success',
                action: 'switchTab(\'lectures\')'
            },
            {
                icon: 'fa-chart-bar',
                title: 'عرض الإحصائيات',
                color: 'info',
                action: 'switchTab(\'attendance\')'
            },
            {
                icon: 'fa-user-circle',
                title: 'الملف الشخصي',
                color: 'warning',
                action: 'switchTab(\'profile\')'
            }
        ];
    }
    
    container.innerHTML = actions.map(action => `
        <div class="quick-action-card quick-action-${action.color}" onclick="${action.action}">
            <div class="quick-action-icon">
                <i class="fas ${action.icon}"></i>
            </div>
            <div class="quick-action-title">${action.title}</div>
        </div>
    `).join('');
}

async function loadRecentActivity() {
    const activityContainer = document.getElementById('recentActivity');
    
    try {
        const lecturesResponse = await fetch('/api/admin/lectures', { credentials: 'include' });
        const lecturesData = await lecturesResponse.json();
        
        if (lecturesData.success && lecturesData.lectures) {
            const recentLectures = lecturesData.lectures.slice(0, 6);
            
            if (recentLectures.length > 0) {
                activityContainer.innerHTML = recentLectures.map((lecture, index) => `
                    <div class="activity-item" style="animation-delay: ${index * 0.1}s">
                        <div class="activity-icon activity-icon-${lecture.lecture_finished ? 'finished' : 'active'}">
                            <i class="fas fa-${lecture.lecture_type === 'lecture' ? 'chalkboard-teacher' : 'users'}"></i>
                        </div>
                        <div class="activity-content">
                            <div class="activity-title">${lecture.title}</div>
                            <div class="activity-details">
                                <span class="activity-subject"><i class="fas fa-book me-1"></i>${lecture.subject_name}</span>
                                <span class="activity-date"><i class="fas fa-calendar me-1"></i>${new Date(lecture.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}</span>
                            </div>
                        </div>
                        <div class="activity-status">
                            ${lecture.lecture_finished 
                                ? '<span class="badge bg-secondary"><i class="fas fa-check me-1"></i>انتهت</span>' 
                                : '<span class="badge bg-success pulse"><i class="fas fa-circle me-1"></i>نشطة</span>'
                            }
                        </div>
                    </div>
                `).join('');
            } else {
                activityContainer.innerHTML = `
                    <div class="empty-state-small">
                        <div class="empty-icon-small"><i class="fas fa-inbox"></i></div>
                        <p>لا توجد محاضرات حديثة</p>
                    </div>
                `;
            }
        } else {
            activityContainer.innerHTML = `
                <div class="empty-state-small">
                    <div class="empty-icon-small"><i class="fas fa-exclamation-circle"></i></div>
                    <p>لا يمكن تحميل الأنشطة حالياً</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        activityContainer.innerHTML = `
            <div class="empty-state-small">
                <div class="empty-icon-small"><i class="fas fa-exclamation-triangle"></i></div>
                <p>خطأ في تحميل الأنشطة</p>
            </div>
        `;
    }
}

// Doctors Management (Super Admin Only)
async function loadDoctors() {
    try {
        const response = await fetch('/api/admin/doctors', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            doctors = data.doctors;
            renderDoctorsTable();
        } else {
            showError('خطأ في تحميل قائمة الدكاترة');
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
        showError('خطأ في الاتصال بالخادم');
    }
}

function renderDoctorsTable() {
    const doctorsTab = document.getElementById('doctorsTab');
    console.log('Rendering doctors table, count:', doctors.length, doctors);
    
    if (doctors.length === 0) {
        doctorsTab.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h4><i class="fas fa-user-md me-2"></i>إدارة الدكاترة</h4>
                <button class="btn btn-primary-modern btn-modern" onclick="showCreateDoctorModal()">
                    <i class="fas fa-plus me-2"></i>إضافة دكتور
                </button>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-user-md"></i></div>
                <div class="empty-state-title">لا يوجد دكاترة</div>
                <div class="empty-state-message">ابدأ بإضافة دكتور جديد للنظام</div>
            </div>
        `;
        return;
    }
    
    doctorsTab.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h4><i class="fas fa-user-md me-2"></i>إدارة الدكاترة</h4>
            <button class="btn btn-primary-modern btn-modern" onclick="showCreateDoctorModal()">
                <i class="fas fa-plus me-2"></i>إضافة دكتور
            </button>
        </div>
        
        <div class="doctors-grid">
            ${doctors.map((doctor, index) => `
                <div class="doctor-card" style="animation-delay: ${index * 0.1}s">
                    <div class="doctor-avatar">
                        ${(doctor.full_name || 'د').charAt(0).toUpperCase()}
                    </div>
                    <div class="doctor-name">${doctor.full_name || 'غير محدد'}</div>
                    <div class="doctor-info">
                        <i class="fas fa-user me-1"></i>${doctor.username}
                    </div>
                    <div class="doctor-stats">
                        <div class="doctor-stat-item">
                            <span class="doctor-stat-value">${doctor.subjects_count || 0}</span>
                            <span class="doctor-stat-label">المواد</span>
                        </div>
                        <div class="doctor-stat-item">
                            <span class="doctor-stat-value">${doctor.lectures_count || 0}</span>
                            <span class="doctor-stat-label">المحاضرات</span>
                        </div>
                    </div>
                    <div class="mb-2">
                        <small class="text-muted"><i class="fas fa-book me-1"></i>${doctor.subjects_names || 'غير مخصص'}</small>
                    </div>
                    <div class="mb-3">
                        <span class="badge badge-modern ${doctor.is_active ? 'bg-success' : 'bg-danger'}">
                            ${doctor.is_active ? 'نشط' : 'معطل'}
                        </span>
                    </div>
                    <div class="doctor-actions">
                        <button class="btn btn-card-view btn-card-action" onclick="showDoctorStats(${doctor.id})" title="عرض الإحصائيات">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                        <button class="btn btn-card-edit btn-card-action" onclick="editDoctor(${doctor.id})" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-card-delete btn-card-action" onclick="deleteDoctor(${doctor.id})" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Subjects Management (Super Admin Only)
async function loadSubjects() {
    try {
        console.log('Loading subjects...');
        const response = await fetch('/api/admin/subjects/all', {
            credentials: 'include'
        });
        
        console.log('Subjects response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Subjects response data:', data);
        
        if (data.success) {
            subjects = data.subjects || [];
            renderSubjectsTable();
        } else {
            console.error('API returned error:', data.message);
            showNotification(data.message || 'خطأ في تحميل قائمة المواد', 'error');
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
        showNotification('خطأ في الاتصال بالخادم: ' + error.message, 'error');
    }
}

function renderSubjectsTable() {
    const subjectsTab = document.getElementById('subjectsTab');
    
    if (subjects.length === 0) {
        subjectsTab.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h4><i class="fas fa-book me-2"></i>إدارة المواد</h4>
                <button class="btn btn-primary-modern btn-modern" onclick="showCreateSubjectModal()">
                    <i class="fas fa-plus me-2"></i>إضافة مادة
                </button>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-book"></i></div>
                <div class="empty-state-title">لا توجد مواد</div>
                <div class="empty-state-message">ابدأ بإضافة مادة جديدة للنظام</div>
            </div>
        `;
        return;
    }
    
    subjectsTab.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h4><i class="fas fa-book me-2"></i>إدارة المواد</h4>
            <button class="btn btn-primary-modern btn-modern" onclick="showCreateSubjectModal()">
                <i class="fas fa-plus me-2"></i>إضافة مادة
            </button>
        </div>
        
        <div class="subjects-grid">
            ${subjects.map((subject, index) => `
                <div class="subject-card" style="animation-delay: ${index * 0.1}s">
                    <div class="subject-icon">
                        <i class="fas fa-book"></i>
                    </div>
                    <div class="subject-name">${subject.name}</div>
                    <div class="subject-code">
                        ${subject.code ? `<i class="fas fa-hashtag me-1"></i>${subject.code}` : '<i class="fas fa-minus me-1"></i>غير محدد'}
                    </div>
                    ${subject.level_name ? `
                        <div class="subject-level">
                            <i class="fas fa-layer-group me-1"></i>${subject.level_name}
                        </div>
                    ` : '<div class="subject-level" style="background: rgba(150,150,150,0.1); color: #999;">غير محدد</div>'}
                    <div class="mt-2 mb-2">
                        <small class="text-muted">
                            <i class="fas fa-user me-1"></i>${subject.admin_name || 'غير محدد'}
                        </small>
                    </div>
                    <div class="mb-3">
                        <span class="badge badge-modern ${subject.is_active ? 'bg-success' : 'bg-danger'}">
                            ${subject.is_active ? 'نشط' : 'معطل'}
                        </span>
                    </div>
                    <div class="subject-actions">
                        <button class="btn btn-card-edit btn-card-action flex-fill" onclick="editSubject(${subject.id})" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-card-delete btn-card-action flex-fill" onclick="deleteSubject(${subject.id})" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Lectures Management

async function loadLectures() {
    try {
        // Load subjects first for form - different endpoint for doctors
        let subjectsUrl = '/api/admin/subjects';
        if (currentAdmin?.role === 'doctor') {
            subjectsUrl = '/api/admin/doctor-subjects';
        }
        
        console.log('Loading subjects for role:', currentAdmin?.role, 'URL:', subjectsUrl);
        
        const subjectsResponse = await fetch(subjectsUrl, {
            credentials: 'include'
        });
        
        if (subjectsResponse.ok) {
            const subjectsData = await subjectsResponse.json();
            if (subjectsData.success) {
                subjects = subjectsData.subjects;
                console.log('Subjects loaded successfully:', subjects.length);
                
                // If doctor has no subjects, try fallback to all subjects API
                if (currentAdmin?.role === 'doctor' && subjects.length === 0) {
                    console.log('Doctor has no assigned subjects, trying fallback to all subjects API');
                    const fallbackResponse = await fetch('/api/admin/subjects', {
                        credentials: 'include'
                    });
                    if (fallbackResponse.ok) {
                        const fallbackData = await fallbackResponse.json();
                        if (fallbackData.success && fallbackData.subjects.length > 0) {
                            subjects = fallbackData.subjects;
                            console.log('Subjects loaded from fallback:', subjects.length);
                        }
                    }
                }
            }
        } else {
            console.warn('Failed to load subjects from', subjectsUrl, 'status:', subjectsResponse.status);
            // Fallback to regular subjects API if doctor-subjects fails
            if (currentAdmin?.role === 'doctor' && subjectsUrl === '/api/admin/doctor-subjects') {
                const fallbackResponse = await fetch('/api/admin/subjects', {
                    credentials: 'include'
                });
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData.success) {
                        subjects = fallbackData.subjects;
                        console.log('Subjects loaded from fallback:', subjects.length);
                    }
                }
            }
        }
        
        // Load lectures
        const response = await fetch('/api/admin/lectures', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success) {
                lectures = data.lectures || [];
                renderLecturesTab();
                // Ensure subjects dropdown is populated after rendering
                setTimeout(() => {
                    populateSubjectDropdown();
                }, 100);
            } else {
                console.error('Error loading lectures:', data.message);
                showError('خطأ في تحميل المحاضرات');
            }
        } else {
            const errorText = await response.text();
            console.error('Error loading lectures. Status:', response.status, 'Response:', errorText);
            showError(`خطأ في تحميل المحاضرات (${response.status})`);
        }
    } catch (error) {
        console.error('Error loading lectures:', error);
        showError('خطأ في الاتصال بالخادم');
    }
}

function renderLecturesTab() {
    const lecturesTab = document.getElementById('lecturesTab');
    lecturesTab.innerHTML = `
        <!-- Modern Page Header -->
        <div class="lectures-page-header">
            <div class="lectures-page-title-section">
                <h2 class="lectures-page-title">
                    <i class="fas fa-chalkboard-teacher"></i>
                    إدارة المحاضرات
                </h2>
                <p class="lectures-page-subtitle">إضافة وإدارة المحاضرات والسكاشن</p>
            </div>
            <div class="lectures-page-stats">
                <div class="lectures-stat-item">
                    <div class="lectures-stat-icon">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="lectures-stat-content">
                        <div class="lectures-stat-value">${lectures.length}</div>
                        <div class="lectures-stat-label">إجمالي المحاضرات</div>
                    </div>
                </div>
                <div class="lectures-stat-item">
                    <div class="lectures-stat-icon active">
                        <i class="fas fa-circle-dot"></i>
                    </div>
                    <div class="lectures-stat-content">
                        <div class="lectures-stat-value">${lectures.filter(l => !l.lecture_finished).length}</div>
                        <div class="lectures-stat-label">محاضرات نشطة</div>
                    </div>
                </div>
                <div class="lectures-stat-item">
                    <div class="lectures-stat-icon finished">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="lectures-stat-content">
                        <div class="lectures-stat-value">${lectures.filter(l => l.lecture_finished).length}</div>
                        <div class="lectures-stat-label">محاضرات منتهية</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content Area -->
        <div class="lectures-main-container">
            <!-- Left Sidebar - Add Lecture Form -->
            <div class="lectures-sidebar">
                <div class="lectures-form-card">
                    <div class="lectures-form-header">
                        <div class="lectures-form-icon">
                            <i class="fas fa-plus-circle"></i>
                        </div>
                        <h3 class="lectures-form-title">إضافة محاضرة جديدة</h3>
                        <p class="lectures-form-description">أكمل النموذج لإنشاء محاضرة جديدة</p>
                    </div>
                    
                    <form id="lectureForm" class="lectures-modern-form">
                        <div class="form-group-modern">
                            <label class="form-label-modern">
                                <i class="fas fa-book"></i>
                                المادة
                                <span class="required-star">*</span>
                            </label>
                            <select class="form-input-modern" id="lectureSubjectId" required>
                                <option value="">اختر المادة</option>
                            </select>
                        </div>
                        
                        <div class="form-group-modern">
                            <label class="form-label-modern">
                                <i class="fas fa-tag"></i>
                                نوع الجلسة
                            </label>
                            <select class="form-input-modern" id="lectureType" required onchange="toggleGroupFields()">
                                <option value="lecture">محاضرة</option>
                                <option value="section">سكشن</option>
                            </select>
                        </div>
                        
                        <div class="form-group-modern" id="groupNumberField">
                            <label class="form-label-modern">
                                <i class="fas fa-users"></i>
                                رقم الجروب
                            </label>
                            <input type="text" class="form-input-modern" id="groupNumber" placeholder="مثال: G1, G2">
                        </div>
                        
                        <div class="form-group-modern" id="sectionNumberField" style="display: none;">
                            <label class="form-label-modern">
                                <i class="fas fa-layer-group"></i>
                                رقم السكشن
                            </label>
                            <input type="text" class="form-input-modern" id="sectionNumber" placeholder="مثال: S1, S2">
                        </div>
                        
                        <div class="form-group-modern">
                            <label class="form-label-modern">
                                <i class="fas fa-heading"></i>
                                عنوان المحاضرة
                            </label>
                            <input type="text" class="form-input-modern" id="lectureTitle" placeholder="أدخل عنوان المحاضرة" required>
                        </div>
                        
                        <div class="form-group-modern">
                            <label class="form-label-modern">
                                <i class="fas fa-calendar-alt"></i>
                                التاريخ
                            </label>
                            <input type="date" class="form-input-modern" id="lectureDate" required>
                        </div>
                        
                        <div class="form-group-modern">
                            <label class="form-label-modern">
                                <i class="fas fa-clock"></i>
                                وقت البداية
                            </label>
                            <input type="time" class="form-input-modern" id="startTime" required>
                            <small class="form-hint">سيتم تحديد وقت النهاية تلقائياً بعد ساعتين</small>
                        </div>

                        <div class="form-group-modern">
                            <label class="form-label-modern">
                                <i class="fas fa-sync-alt"></i>
                                تحديث الـ QR (بالثواني)
                            </label>
                            <input type="number" class="form-input-modern" id="qrRefreshInterval" placeholder="مثال: 30">
                            <small class="form-hint">اتركه فارغاً لعدم التحديث التلقائي</small>
                        </div>
                        
                        <button type="submit" id="submitLectureBtn" class="btn-submit-modern">
                            <i class="fas fa-plus-circle"></i>
                            <span>إضافة المحاضرة</span>
                        </button>
                    </form>
                </div>
            </div>
            
            <!-- Right Content - Lectures List -->
            <div class="lectures-content">
                <!-- Filters Section -->
                <div class="lectures-filters-card">
                    <div class="filters-header">
                        <div class="filters-title">
                            <i class="fas fa-filter"></i>
                            <span>تصفية المحاضرات</span>
                        </div>
                        <button class="btn-reset-filters" onclick="resetLectureFilters()">
                            <i class="fas fa-redo"></i>
                            إعادة تعيين
                        </button>
                    </div>
                    <div class="filters-grid">
                        <div class="filter-item">
                            <label class="filter-label">
                                <i class="fas fa-layer-group"></i>
                                المرحلة
                            </label>
                            <select class="filter-select" id="lectureLevelFilter" onchange="filterLecturesByLevelAndSubject()">
                                <option value="">جميع المراحل</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <label class="filter-label">
                                <i class="fas fa-book"></i>
                                المادة
                            </label>
                            <select class="filter-select" id="lectureSubjectFilter" onchange="filterLecturesByLevelAndSubject()">
                                <option value="">جميع المواد</option>
                                ${subjects.map(subject => `
                                    <option value="${subject.id}" data-level="${subject.level_id || ''}">${subject.name}${subject.level_name ? ' (' + subject.level_name + ')' : ''}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="filter-item">
                            <label class="filter-label">
                                <i class="fas fa-calendar"></i>
                                التاريخ
                            </label>
                            <input type="date" class="filter-select" id="lectureDateFilter" onchange="filterLecturesByLevelAndSubject()" />
                        </div>
                    </div>
                </div>
                
                <!-- Lectures List -->
                <div id="lecturesList">
                    ${renderLecturesList()}
                </div>
            </div>
        </div>
    `;
    
    // Set today's date as default
    document.getElementById('lectureDate').value = new Date().toISOString().split('T')[0];
    
    // Load subjects for dropdown
    populateSubjectDropdown();
    
    // Load levels for filter dropdown
    populateLevelFilterDropdown();
    
    // Set today's date as default for date filter
    setDefaultDateFilter();
    
    // Add event listener for form submission
    setTimeout(() => {
        const form = document.getElementById('lectureForm');
        if (form) {
            // Remove existing listeners first to prevent duplicates
            form.removeEventListener('submit', handleLectureSubmit);
            console.log('Adding form event listener');
            form.addEventListener('submit', handleLectureSubmit);
        } else {
            console.error('Lecture form not found');
        }
    }, 100);
}

function populateSubjectDropdown() {
    const subjectSelect = document.getElementById('lectureSubjectId');
    if (subjectSelect) {
        if (subjects && subjects.length > 0) {
            subjectSelect.innerHTML = '<option value="">اختر المادة</option>';
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.id;
                option.textContent = subject.name;
                subjectSelect.appendChild(option);
            });
            console.log(`Populated subject dropdown with ${subjects.length} subjects`);
        } else {
            if (subjects === undefined) {
                subjectSelect.innerHTML = '<option value="">جاري تحميل المواد...</option>';
                console.log('No subjects loaded yet, will retry...');
                // Retry after a short delay
                setTimeout(() => {
                    populateSubjectDropdown();
                }, 1000);
            } else {
                // subjects is empty array - no subjects assigned
                subjectSelect.innerHTML = '<option value="">لا توجد مواد مخصصة</option>';
                console.log('No subjects available for this doctor');
            }
        }
    } else {
        console.log('Subject select element not found');
    }
}

async function populateLevelFilterDropdown() {
    const levelFilterSelect = document.getElementById('lectureLevelFilter');
    if (levelFilterSelect) {
        try {
            const response = await fetch('/api/admin/levels', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success && data.levels) {
                levelFilterSelect.innerHTML = '<option value="">جميع المراحل</option>';
                
                // Get unique levels from subjects that have lectures
                const levelsWithSubjects = new Set();
                subjects.forEach(subject => {
                    if (subject.level_id) {
                        levelsWithSubjects.add(subject.level_id);
                    }
                });
                
                data.levels.forEach(level => {
                    if (levelsWithSubjects.has(level.id)) {
                        const option = document.createElement('option');
                        option.value = level.id;
                        option.textContent = level.name;
                        levelFilterSelect.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error('Error loading levels for filter:', error);
        }
    }
}

// Handle lecture form submission
// Toggle group and section fields based on lecture type
function toggleGroupFields() {
    const lectureType = document.getElementById('lectureType').value;
    const groupField = document.getElementById('groupNumberField');
    const sectionField = document.getElementById('sectionNumberField');
    
    if (lectureType === 'section') {
        sectionField.style.display = 'block';
        document.getElementById('sectionNumber').required = true;
    } else {
        sectionField.style.display = 'none';
        document.getElementById('sectionNumber').required = false;
        document.getElementById('sectionNumber').value = '';
    }
}

// Global variable to prevent double submission
let isSubmitting = false;

function resetSubmitButton() {
    const submitBtn = document.getElementById('submitLectureBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus me-2"></i>إضافة المحاضرة';
    }
}

async function handleLectureSubmit(e) {
    e.preventDefault();
    
    if (isSubmitting) {
        console.log('Already submitting, ignoring duplicate submission');
        return;
    }
    
    isSubmitting = true;
    console.log('handleLectureSubmit called');
    
    const lectureTypeEl = document.getElementById('lectureType');
    const groupNumberEl = document.getElementById('groupNumber');
    const sectionNumberEl = document.getElementById('sectionNumber');
    const titleEl = document.getElementById('lectureTitle');
    const dateEl = document.getElementById('lectureDate');
    const startTimeEl = document.getElementById('startTime');
    const subjectIdEl = document.getElementById('lectureSubjectId');
    
    if (!lectureTypeEl || !titleEl || !dateEl || !startTimeEl || !subjectIdEl) {
        console.error('Missing form elements:', { lectureTypeEl, titleEl, dateEl, startTimeEl, subjectIdEl });
        showError('خطأ في تحميل النموذج');
        isSubmitting = false;
        resetSubmitButton();
        return;
    }
    
    const lectureType = lectureTypeEl.value;
    const groupNumber = groupNumberEl?.value || '';
    const sectionNumber = sectionNumberEl?.value || '';
    const title = titleEl.value;
    const date = dateEl.value;
    const startTime = startTimeEl.value;
    const subjectId = subjectIdEl.value;
    const qrRefreshInterval = document.getElementById('qrRefreshInterval').value;
    
    console.log('Form data:', { lectureType, groupNumber, sectionNumber, title, date, startTime, subjectId, qrRefreshInterval });
    
    if (!title || !date || !startTime) {
        showError('يرجى ملء جميع الحقول المطلوبة');
        isSubmitting = false;
        resetSubmitButton();
        return;
    }
    
    if (!subjectId) {
        showError('يرجى اختيار المادة');
        isSubmitting = false;
        resetSubmitButton();
        return;
    }
    
    if (lectureType === 'section' && !sectionNumber) {
        showError('يرجى إدخال رقم السكشن');
        isSubmitting = false;
        resetSubmitButton();
        return;
    }
    
    try {
        // Disable submit button and show loading
        const submitBtn = document.getElementById('submitLectureBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>جاري الإضافة...';
        }
        showLoading();
        
        const requestBody = {
            lecture_type: lectureType,
            group_number: groupNumber || null,
            section_number: sectionNumber || null,
            title: title,
            date: date,
            start_time: startTime,
            subject_id: subjectId,
            qr_refresh_interval: qrRefreshInterval || null
        };
        
        console.log('Sending request to create lecture:', requestBody);
        
        const response = await fetch('/api/admin/lectures', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            hideLoading();
            showError(`خطأ في الخادم: ${response.status}`);
            isSubmitting = false;
            resetSubmitButton();
            return;
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        hideLoading();
        
        if (data.success) {
            showNotification('تم إضافة المحاضرة بنجاح', 'success');
            document.getElementById('lectureForm').reset();
            document.getElementById('lectureDate').value = new Date().toISOString().split('T')[0];
            await loadLectures(); // Load all lectures instead of specific subject
        } else {
            showError(data.message || 'خطأ في إضافة المحاضرة');
        }
    } catch (error) {
        hideLoading();
        console.error('Error creating lecture:', error);
        showError('خطأ في الاتصال بالخادم');
    } finally {
        isSubmitting = false;
        resetSubmitButton();
    }
}

// Load lectures for a specific subject
async function loadLecturesForSubject(subjectId) {
    try {
        const response = await fetch(`/api/admin/lectures/${subjectId}`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            lectures = data.lectures;
            displayLectures();
        } else {
            showError('خطأ في تحميل المحاضرات');
        }
    } catch (error) {
        console.error('Error loading lectures:', error);
        showError('خطأ في الاتصال بالخادم');
    }
}

// Helper function to get status badge for lecture
function getLectureStatusBadge(lecture) {
    if (lecture.lecture_finished) {
        return '<span class="lecture-status-badge lecture-status-finished"><i class="fas fa-check-circle"></i> منتهية</span>';
    } else if (lecture.attendance_finished) {
        return '<span class="lecture-status-badge lecture-status-closed"><i class="fas fa-lock"></i> مغلق الحضور</span>';
    } else {
        return '<span class="lecture-status-badge lecture-status-active"><i class="fas fa-circle-dot"></i> نشطة</span>';
    }
}

// Helper function to format date in Arabic
function formatArabicDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function renderLecturesList() {
    if (lectures.length === 0) {
        return `
            <div class="lectures-empty-state">
                <div class="empty-state-icon-modern">
                    <i class="fas fa-chalkboard-teacher"></i>
                </div>
                <h5 class="empty-state-title-modern">لا توجد محاضرات</h5>
                <p class="empty-state-text-modern">ابدأ بإضافة محاضرة جديدة من النموذج أعلاه</p>
            </div>
        `;
    }
    
    return `
        <div class="lectures-modern-grid">
            ${lectures.map((lecture, index) => {
                const isLecture = lecture.lecture_type === 'lecture';
                const typeIcon = isLecture ? 'chalkboard-teacher' : 'users';
                const typeClass = isLecture ? 'type-lecture' : 'type-section';
                const typeText = isLecture ? 'محاضرة' : 'سكشن';
                
                return `
                <div class="lecture-modern-card" style="animation-delay: ${index * 0.05}s" data-lecture-id="${lecture.id}">
                    <!-- Header Section -->
                    <div class="lecture-modern-header">
                        <div class="lecture-type-indicator ${typeClass}">
                            <i class="fas fa-${typeIcon}"></i>
                            <span>${typeText}</span>
                        </div>
                        ${getLectureStatusBadge(lecture)}
                    </div>
                    
                    <!-- Main Content -->
                    <div class="lecture-modern-content">
                        <h3 class="lecture-modern-title">${lecture.title}</h3>
                        <p class="lecture-modern-subject">
                            <i class="fas fa-book"></i>
                            ${lecture.subject_name}
                        </p>
                        
                        <div class="lecture-modern-details">
                            ${lecture.created_by_name ? `
                                <div class="lecture-detail-item">
                                    <div class="lecture-detail-icon">
                                        <i class="fas fa-user-tie"></i>
                                    </div>
                                    <div class="lecture-detail-text">
                                        <span class="lecture-detail-label">المحاضر</span>
                                        <span class="lecture-detail-value">${lecture.created_by_name}</span>
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="lecture-detail-item">
                                <div class="lecture-detail-icon">
                                    <i class="fas fa-calendar-alt"></i>
                                </div>
                                <div class="lecture-detail-text">
                                    <span class="lecture-detail-label">التاريخ</span>
                                    <span class="lecture-detail-value">${formatArabicDate(lecture.date)}</span>
                                </div>
                            </div>
                            
                            <div class="lecture-detail-item">
                                <div class="lecture-detail-icon">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <div class="lecture-detail-text">
                                    <span class="lecture-detail-label">الوقت</span>
                                    <span class="lecture-detail-value">${lecture.start_time} - ${lecture.end_time}</span>
                                </div>
                            </div>
                            
                            ${lecture.group_number || lecture.section_number ? `
                                <div class="lecture-detail-item">
                                    <div class="lecture-detail-icon">
                                        <i class="fas fa-layer-group"></i>
                                    </div>
                                    <div class="lecture-detail-text">
                                        <span class="lecture-detail-label">المجموعات</span>
                                        <span class="lecture-detail-value">
                                            ${lecture.group_number ? `جروب ${lecture.group_number}` : ''}
                                            ${lecture.group_number && lecture.section_number ? ' - ' : ''}
                                            ${lecture.section_number ? `سكشن ${lecture.section_number}` : ''}
                                        </span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Quick Actions -->
                    <div class="lecture-quick-actions">
                        <button class="lecture-quick-btn lecture-btn-qr" onclick="showQRCode(${lecture.id})" title="عرض QR Code">
                            <i class="fas fa-qrcode"></i>
                        </button>
                        <button class="lecture-quick-btn lecture-btn-fullscreen" onclick="showQRCodeFullscreen(${lecture.id})" title="شاشة كاملة">
                            <i class="fas fa-expand"></i>
                        </button>
                        <button class="lecture-quick-btn lecture-btn-edit-qr" onclick="showEditQrIntervalModal(${lecture.id}, ${lecture.qr_refresh_interval})" title="تعديل وقت تحديث QR">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="lecture-quick-btn lecture-btn-add" onclick="showManualAttendanceModal(${lecture.id}, '${lecture.title.replace(/'/g, "\\'")}', '${lecture.lecture_type}')" title="إضافة حضور">
                            <i class="fas fa-user-plus"></i>
                        </button>
                        <button class="lecture-quick-btn lecture-btn-stats" onclick="viewLectureStats(${lecture.id})" title="الإحصائيات">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                    </div>
                    
                    <!-- Control Buttons -->
                    <div class="lecture-modern-controls">
                        <button class="lecture-control-btn ${lecture.attendance_finished ? 'lecture-btn-unlock' : 'lecture-btn-lock'}" 
                                onclick="toggleAttendanceStatus(${lecture.id}, ${lecture.attendance_finished})">
                            <i class="fas fa-${lecture.attendance_finished ? 'unlock' : 'lock'}"></i>
                            <span>${lecture.attendance_finished ? 'فتح الحضور' : 'إغلاق الحضور'}</span>
                        </button>
                        
                        <button class="lecture-control-btn ${lecture.lecture_finished ? 'lecture-btn-reopen' : 'lecture-btn-finish'}" 
                                onclick="toggleLectureFinished(${lecture.id}, ${lecture.lecture_finished})">
                            <i class="fas fa-${lecture.lecture_finished ? 'undo' : 'check'}"></i>
                            <span>${lecture.lecture_finished ? 'إعادة فتح' : 'إنهاء'}</span>
                        </button>
                        
                        <button class="lecture-control-btn lecture-btn-delete" onclick="deleteLecture(${lecture.id})">
                            <i class="fas fa-trash"></i>
                            <span>حذف</span>
                        </button>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;
}

function displayLectures() {
    const container = document.getElementById('lecturesList');
    if (container) {
        container.innerHTML = renderLecturesList();
    }
}

// Advanced Attendance Statistics
let charts = {}; // Store chart instances

async function loadAttendanceStats() {
    const attendanceTab = document.getElementById('attendanceTab');
    
    try {
        // Load overview statistics
        const overviewResponse = await fetch('/api/admin/statistics/overview', {
            credentials: 'include'
        });
        const overviewData = await overviewResponse.json();
        
        if (!overviewData.success) {
            attendanceTab.innerHTML = '<div class="alert alert-danger">خطأ في تحميل الإحصائيات</div>';
            return;
        }
        
        // Load additional statistics if super admin
        let doctorsData = null;
        let subjectsData = null;
        
        if (currentAdmin?.role === 'super_admin') {
            try {
                const [doctorsResponse, subjectsResponse] = await Promise.all([
                    fetch('/api/admin/statistics/doctors', { credentials: 'include' }),
                    fetch('/api/admin/statistics/subjects', { credentials: 'include' })
                ]);
                
                const doctorsResult = await doctorsResponse.json();
                const subjectsResult = await subjectsResponse.json();
                
                if (doctorsResult.success) doctorsData = doctorsResult.data;
                if (subjectsResult.success) subjectsData = subjectsResult.data;
            } catch (err) {
                console.error('Error loading additional stats:', err);
            }
        }
        
        await renderAdvancedStatistics({ 
            overview: overviewData, 
            doctors: doctorsData, 
            subjects: subjectsData 
        });
        
    } catch (error) {
        console.error('Error loading attendance stats:', error);
        attendanceTab.innerHTML = '<div class="alert alert-danger">خطأ في الاتصال بالخادم</div>';
    }
}

async function renderAdvancedStatistics(data) {
    const attendanceTab = document.getElementById('attendanceTab');
    const isSuperAdmin = currentAdmin?.role === 'super_admin';
    
    let content = `
        <div class="statistics-header">
            <div class="statistics-title">
                <i class="fas fa-chart-line me-3"></i>
                <div>
                    <h3>لوحة الإحصائيات</h3>
                    <p class="text-muted mb-0">تحليل شامل للحضور والأداء</p>
                </div>
            </div>
            ${isSuperAdmin ? `
                <button class="btn btn-primary-modern" onclick="showCreateSuperAdminModal()">
                    <i class="fas fa-user-shield me-2"></i>إضافة مدير عام
                </button>
            ` : ''}
        </div>
        
        <!-- Overview stats cards with modern design -->
        <div class="stats-overview-grid">
            <div class="stat-card stat-card-primary">
                <div class="stat-card-icon">
                    <i class="fas fa-book"></i>
                </div>
                <div class="stat-card-content">
                    <div class="stat-value" data-count="${data.overview.overview?.total_subjects || 0}">0</div>
                    <div class="stat-label">إجمالي المواد</div>
                </div>
                <div class="stat-card-bg">
                    <i class="fas fa-book"></i>
                </div>
            </div>
            
            <div class="stat-card stat-card-warning">
                <div class="stat-card-icon">
                    <i class="fas fa-chalkboard-teacher"></i>
                </div>
                <div class="stat-card-content">
                    <div class="stat-value" data-count="${data.overview.overview?.total_lectures || 0}">0</div>
                    <div class="stat-label">إجمالي المحاضرات</div>
                </div>
                <div class="stat-card-bg">
                    <i class="fas fa-chalkboard-teacher"></i>
                </div>
            </div>
            
            <div class="stat-card stat-card-success">
                <div class="stat-card-icon">
                    <i class="fas fa-user-check"></i>
                </div>
                <div class="stat-card-content">
                    <div class="stat-value" data-count="${data.overview.overview?.total_attendance_records || 0}">0</div>
                    <div class="stat-label">إجمالي الحضور</div>
                </div>
                <div class="stat-card-bg">
                    <i class="fas fa-user-check"></i>
                </div>
            </div>
            
            <div class="stat-card stat-card-info">
                <div class="stat-card-icon">
                    <i class="fas fa-percentage"></i>
                </div>
                <div class="stat-card-content">
                    <div class="stat-value" data-count="${data.overview.overview?.lectures_with_attendance || 0}">0</div>
                    <div class="stat-label">محاضرات بها حضور</div>
                </div>
                <div class="stat-card-bg">
                    <i class="fas fa-percentage"></i>
                </div>
            </div>
        </div>
    `;
    
    // Charts section - Daily Attendance Chart
    content += `
        <div class="charts-section">
            <div class="chart-container-modern">
                <div class="chart-header">
                    <div class="chart-title">
                        <i class="fas fa-chart-area me-2"></i>
                        <span>الحضور اليومي</span>
                    </div>
                    <div class="chart-controls">
                        <select class="form-select form-select-sm" id="chartPeriodSelect" onchange="loadDailyAttendanceChart()">
                            <option value="7">آخر 7 أيام</option>
                            <option value="14" selected>آخر 14 يوم</option>
                            <option value="30">آخر 30 يوم</option>
                        </select>
                    </div>
                </div>
                <div class="chart-body">
                    <canvas id="dailyAttendanceChart"></canvas>
                </div>
            </div>
        </div>
    `;
    
    // Super Admin specific content - Detailed Statistics
    if (isSuperAdmin) {
        content += `
            <div class="statistics-detailed-section">
                <div class="section-header">
                    <h5><i class="fas fa-users me-2"></i>إحصائيات الدكاترة</h5>
                    <div class="search-box-stats">
                        <i class="fas fa-search"></i>
                        <input type="text" id="searchDoctors" class="search-input-stats" placeholder="ابحث عن دكتور..." oninput="filterDoctorStats()">
                    </div>
                </div>
                <div class="stats-grid" id="doctorsStatsGrid">
                    ${data.doctors && data.doctors.length > 0 ? data.doctors.map((doctor, index) => `
                        <div class="detail-stat-card doctor-stat-item" data-doctor-name="${(doctor.full_name || '').toLowerCase()}" data-subject="${(doctor.subject_names || doctor.subject_name || '').toLowerCase()}" style="animation-delay: ${index * 0.05}s">
                            <div class="detail-stat-header">
                                <div class="detail-stat-avatar">
                                    <i class="fas fa-user-tie"></i>
                                </div>
                                <div class="detail-stat-info">
                                    <h6>${doctor.full_name || 'غير محدد'}</h6>
                                    <p><i class="fas fa-book me-1"></i>${doctor.subject_names || doctor.subject_name || 'غير مخصص'}</p>
                                </div>
                            </div>
                            <div class="detail-stat-metrics">
                                <div class="metric-item">
                                    <span class="metric-value">${doctor.total_lectures || 0}</span>
                                    <span class="metric-label">المحاضرات</span>
                                </div>
                                <div class="metric-item">
                                    <span class="metric-value">${doctor.total_attendance_records || 0}</span>
                                    <span class="metric-label">الحضور</span>
                                </div>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="empty-state-modern">
                            <div class="empty-icon"><i class="fas fa-user-md"></i></div>
                            <h5>لا توجد إحصائيات</h5>
                            <p class="text-muted">لم يتم إضافة أي دكاترة بعد</p>
                        </div>
                    `}
                </div>
            </div>
            
            <div class="statistics-detailed-section">
                <div class="section-header">
                    <h5><i class="fas fa-book-open me-2"></i>إحصائيات المواد</h5>
                    <div class="search-box-stats">
                        <i class="fas fa-search"></i>
                        <input type="text" id="searchSubjects" class="search-input-stats" placeholder="ابحث عن مادة..." oninput="filterSubjectStats()">
                    </div>
                </div>
                <div class="stats-grid" id="subjectsStatsGrid">
                    ${data.subjects && data.subjects.length > 0 ? data.subjects.map((subject, index) => `
                        <div class="detail-stat-card subject-stat-item" data-subject-name="${(subject.name || '').toLowerCase()}" data-doctor="${(subject.doctor_name || '').toLowerCase()}" style="animation-delay: ${index * 0.05}s">
                            <div class="detail-stat-header">
                                <div class="detail-stat-avatar detail-stat-avatar-subject">
                                    <i class="fas fa-graduation-cap"></i>
                                </div>
                                <div class="detail-stat-info">
                                    <h6>${subject.name}</h6>
                                    <p><i class="fas fa-user me-1"></i>${subject.doctor_name || 'غير محدد'}</p>
                                </div>
                            </div>
                            <div class="detail-stat-metrics">
                                <div class="metric-item">
                                    <span class="metric-value">${subject.total_lectures || 0}</span>
                                    <span class="metric-label">المحاضرات</span>
                                </div>
                                <div class="metric-item">
                                    <span class="metric-value">${subject.total_attendance_records || 0}</span>
                                    <span class="metric-label">الحضور</span>
                                </div>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="empty-state-modern">
                            <div class="empty-icon"><i class="fas fa-book"></i></div>
                            <h5>لا توجد إحصائيات</h5>
                            <p class="text-muted">لم يتم إضافة أي مواد بعد</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }
    
    attendanceTab.innerHTML = content;
    
    // Animate counters
    document.querySelectorAll('.stat-value[data-count]').forEach(element => {
        const target = parseInt(element.getAttribute('data-count'));
        animateCounter(element, target, 1500);
    });
    
    // Initialize charts
    await initializeCharts(data);
    
    // Load daily attendance chart
    await loadDailyAttendanceChart();
}

// Initialize charts - Removed lectures distribution and doctors chart for doctors
async function initializeCharts(data) {
    // Destroy existing charts
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    charts = {};
    
    // No additional charts needed - Daily attendance chart is loaded separately
}

// Load Daily Attendance Chart
async function loadDailyAttendanceChart() {
    const chartCanvas = document.getElementById('dailyAttendanceChart');
    if (!chartCanvas) return;
    
    const periodSelect = document.getElementById('chartPeriodSelect');
    const days = periodSelect ? periodSelect.value : 14;
    
    try {
        const response = await fetch(`/api/admin/statistics/daily-attendance?days=${days}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch daily attendance data');
        }
        
        const result = await response.json();
        
        if (!result.success || !result.data) {
            throw new Error('Invalid data format');
        }
        
        // Destroy existing chart if any
        if (charts.dailyAttendance) {
            charts.dailyAttendance.destroy();
        }
        
        // Prepare data
        const labels = result.data.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
        });
        
        const attendanceData = result.data.map(item => item.attendance);
        const lecturesData = result.data.map(item => item.lectures);
        
        // Get theme-appropriate colors
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDarkTheme ? '#e0e0e0' : '#666';
        const gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        
        // Create chart
        charts.dailyAttendance = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'عدد الحضور',
                        data: attendanceData,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: '#4CAF50',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    },
                    {
                        label: 'عدد المحاضرات',
                        data: lecturesData,
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: '#2196F3',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            padding: 15,
                            font: {
                                size: 13,
                                family: 'Cairo, sans-serif'
                            },
                            color: textColor,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: isDarkTheme ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                        titleColor: isDarkTheme ? '#fff' : '#333',
                        bodyColor: isDarkTheme ? '#e0e0e0' : '#666',
                        borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.parsed.y;
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: textColor,
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: textColor,
                            font: {
                                size: 11
                            },
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading daily attendance chart:', error);
        // Show error message in chart area
        const ctx = chartCanvas.getContext('2d');
        ctx.font = '16px Cairo';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'center';
        ctx.fillText('خطأ في تحميل البيانات', chartCanvas.width / 2, chartCanvas.height / 2);
    }
}

// Load statistics for selected period
async function loadPeriodStats() {
    const period = document.getElementById('statsPeriod').value;
    const dateInput = document.getElementById('statsDate');
    const date = dateInput.value;
    
    if (!date) {
        showNotification('يرجى اختيار تاريخ', 'warning');
        return;
    }
    
    try {
        let url = '';
        if (period === 'daily') {
            url = `/api/admin/statistics/daily/${date}`;
        } else if (period === 'weekly') {
            url = `/api/admin/statistics/weekly/${date}`;
        } else if (period === 'monthly') {
            const [year, month] = date.split('-');
            url = `/api/admin/statistics/monthly/${year}/${month}`;
        }
        
        const response = await fetch(url, { credentials: 'include' });
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('periodLectures').textContent = data.data.total_lectures || 0;
            document.getElementById('totalAttendance').textContent = data.data.total_attendance || 0;
            
            const periodLabels = {
                daily: 'محاضرات اليوم',
                weekly: 'محاضرات الأسبوع',
                monthly: 'محاضرات الشهر'
            };
            document.getElementById('periodLabel').textContent = periodLabels[period] || 'المحاضرات';
        }
    } catch (error) {
        console.error('Error loading period stats:', error);
        showNotification('خطأ في تحميل الإحصائيات', 'error');
    }
}

// Show create super admin modal
function showCreateSuperAdminModal() {
    const modal = new bootstrap.Modal(document.getElementById('createSuperAdminModal'));
    modal.show();
}

// Create super admin
async function createSuperAdmin() {
    const username = document.getElementById('superAdminUsername').value;
    const password = document.getElementById('superAdminPassword').value;
    const fullName = document.getElementById('superAdminFullName').value;
    const email = document.getElementById('superAdminEmail').value;
    
    if (!username || !password || !fullName) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/admin/super-admin/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password, full_name: fullName, email })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification('تم إنشاء المدير العام بنجاح!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createSuperAdminModal'));
            modal.hide();
            
            // Clear form
            document.getElementById('createSuperAdminForm').reset();
        } else {
            showNotification(data.message || 'خطأ في إنشاء المدير العام', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error creating super admin:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

function renderAttendanceStats(data) {
    const attendanceTab = document.getElementById('attendanceTab');
    
    let content = `
        <div class="row mb-4">
            <div class="col-12">
                <h4><i class="fas fa-chart-bar me-2"></i>إحصائيات الحضور</h4>
            </div>
        </div>
    `;
    
    if (currentAdmin?.role === 'super_admin' && data.doctorStatistics) {
        // Super admin view - all doctors
        content += `
            <div class="row mb-4">
                <div class="col-12">
                    <h5>إحصائيات الدكاترة</h5>
                    <div class="table-modern">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>اسم الدكتور</th>
                                    <th>اسم المستخدم</th>
                                    <th>المادة</th>
                                    <th>عدد المحاضرات</th>
                                    <th>إجمالي الحضور</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.doctorStatistics.map(doctor => `
                                    <tr>
                                        <td>${doctor.full_name || 'غير محدد'}</td>
                                        <td>${doctor.username}</td>
                                        <td>${doctor.subject_name || 'غير مخصص'}</td>
                                        <td>${doctor.total_lectures || 0}</td>
                                        <td>${doctor.total_attendance || 0}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
    
    // General statistics
    const stats = data.overview;
    content += `
        <div class="row">
            <div class="col-md-3 mb-4">
                <div class="stats-card">
                    <div class="stats-icon text-info">
                        <i class="fas fa-book"></i>
                    </div>
                    <div class="stats-number">${stats.total_subjects || 0}</div>
                    <div class="stats-label">إجمالي المواد</div>
                </div>
            </div>
            
            <div class="col-md-3 mb-4">
                <div class="stats-card">
                    <div class="stats-icon text-warning">
                        <i class="fas fa-chalkboard-teacher"></i>
                    </div>
                    <div class="stats-number">${stats.total_lectures || 0}</div>
                    <div class="stats-label">إجمالي المحاضرات</div>
                </div>
            </div>
            
            <div class="col-md-3 mb-4">
                <div class="stats-card">
                    <div class="stats-icon text-success">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stats-number">${stats.total_attendance_records || 0}</div>
                    <div class="stats-label">إجمالي الحضور</div>
                </div>
            </div>
            
            <div class="col-md-3 mb-4">
                <div class="stats-card">
                    <div class="stats-icon text-danger">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="stats-number">${stats.lectures_with_attendance || 0}</div>
                    <div class="stats-label">محاضرات بالحضور</div>
                </div>
            </div>
        </div>
    `;
    
    attendanceTab.innerHTML = content;
}

// Utility Functions
function showLoading(buttonElement = null) {
    // Add loading indicator
    const loadingBtn = buttonElement || event?.target;
    if (loadingBtn && loadingBtn.tagName === 'BUTTON') {
        loadingBtn.setAttribute('data-original-text', loadingBtn.innerHTML);
        loadingBtn.disabled = true;
        loadingBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>جاري التحميل...';
    }
}

function hideLoading() {
    // Remove loading indicator
    const loadingBtn = document.querySelector('button[disabled]');
    if (loadingBtn && loadingBtn.hasAttribute('data-original-text')) {
        loadingBtn.disabled = false;
        loadingBtn.innerHTML = loadingBtn.getAttribute('data-original-text');
    }
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    const errorMessage = document.getElementById('loginErrorMessage');
    
    if (errorDiv && errorMessage) {
        errorMessage.textContent = message;
        errorDiv.classList.remove('hidden');
    } else {
        showNotification(message, 'danger');
    }
}

// Other existing functions that need to be updated
async function toggleLectureStatus(lectureId, isActive) {
    const newStatus = !isActive;
    
    try {
        const response = await fetch(`/api/admin/lectures/${lectureId}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ isActive: newStatus })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('تم تحديث حالة المحاضرة بنجاح', 'success');
            // Reload lectures to show updated status
            const currentSubjectId = document.getElementById('lectureSubjectFilter').value || 
                                   document.getElementById('subjectSelect').value;
            if (currentSubjectId) {
                loadLecturesForSubject(currentSubjectId);
            }
        } else {
            showError('فشل في تحديث حالة المحاضرة: ' + data.message);
        }
    } catch (error) {
        console.error('Error toggling lecture status:', error);
        showError('خطأ في الاتصال بالخادم');
    }
}

async function showQRCode(lectureId) {
    const lecture = lectures.find(l => l.id === lectureId);
    if (!lecture) {
        showNotification('Lecture not found', 'error');
        return;
    }
    const qrCode = lecture.qr_code;

    try {
        const response = await fetch(`/api/qr/${qrCode}`);
        const data = await response.json();
        
        if (data.success) {
            let qrTimer;
            // Create modal to show QR code
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'qrCodeModal';
            modal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">QR Code للمحاضرة</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <div class="qr-display">
                                <img src="data:image/png;base64,${data.qrImage}" id="qrCodeImage" alt="QR Code" class="img-fluid mb-3" style="max-width: 600px; width: 100%;">
                                <p class="text-muted">QR Code للمحاضرة</p>
                                <div id="qrTimerDisplay" class="mt-2"></div>
                                <div class="mt-3">
                                    <button class="btn btn-primary-modern btn-modern me-2" onclick="printQRCode()">
                                        <i class="fas fa-print me-2"></i>طباعة QR Code
                                    </button>
                                    <button class="btn btn-info-modern btn-modern" onclick="showQRCodeFullscreen('${qrCode}')">
                                        <i class="fas fa-expand me-2"></i>شاشة كاملة
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();

            startOrUpdateQrCodeTimer(lecture.id, 'qrCodeImage', 'qrTimerDisplay');
            
            modal.addEventListener('hidden.bs.modal', () => {
                console.log('QR code modal closed, clearing timer.');
                clearInterval(qrTimer);
                document.body.removeChild(modal);
            });
        } else {
            showError('خطأ في تحميل QR Code');
        }
    } catch (error) {
        console.error('Error showing QR code:', error);
        showError('خطأ في الاتصال بالخادم');
    }
}

function startOrUpdateQrCodeTimer(lectureId, qrImageId, timerDisplayId) {
    if (qrTimer) {
        clearInterval(qrTimer);
    }

    const lecture = lectures.find(l => l.id === lectureId);

    if (lecture && lecture.qr_refresh_interval && lecture.qr_refresh_interval > 0) {
        let timeLeft = lecture.qr_refresh_interval;
        const timerDisplay = document.getElementById(timerDisplayId);

        const updateTimer = () => {
            if (timerDisplay) {
                timerDisplay.innerHTML = `<span class="badge bg-info">يتغير في: ${timeLeft} ثانية</span>`;
            }
            timeLeft--;
        };

        updateTimer();
        qrTimer = setInterval(() => {
            if (timeLeft < 0) {
                clearInterval(qrTimer);
                refreshQRCode(lecture.id, qrImageId, timerDisplayId);
            }
            else {
                updateTimer();
            }
        }, 1000);
    }
}

async function refreshQRCode(lectureId, qrImageId, timerDisplayId) {
    try {
        const refreshResponse = await fetch(`/api/admin/lectures/${lectureId}/refresh-qr`, {
            method: 'POST',
            credentials: 'include'
        });
        const refreshData = await refreshResponse.json();

        if (refreshData.success) {
            const newQrCode = refreshData.qrCode;
            const lecture = lectures.find(l => l.id === lectureId);
            if(lecture) lecture.qr_code = newQrCode;

            const imageResponse = await fetch(`/api/qr/${newQrCode}`);
            const imageData = await imageResponse.json();

            if (imageData.success) {
                const qrImage = document.getElementById(qrImageId);
                if (qrImage) {
                    qrImage.src = `data:image/png;base64,${imageData.qrImage}`;
                }
                startOrUpdateQrCodeTimer(lectureId, qrImageId, timerDisplayId);
            }
        }
    } catch (error) {
        console.error('Error refreshing QR code:', error);
    }
}

function printQRCode() {
    window.print();
}

async function viewLectureStats(lectureId) {
    try {
        console.log('Fetching lecture stats for:', lectureId);
        
        const response = await fetch(`/api/admin/statistics/lecture/${lectureId}`, {
            credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', response.status, errorText);
            showNotification(`خطأ في تحميل الإحصائيات: ${response.status}`, 'error');
            return;
        }
        
        const data = await response.json();
        console.log('Lecture stats data:', data);
        
        if (data.success) {
            // Create modal to show specific lecture statistics
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">إحصائيات المحاضرة: ${data.lecture.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>المادة:</strong> ${data.lecture.subject_name}
                                </div>
                                <div class="col-md-6">
                                    <strong>التاريخ:</strong> ${new Date(data.lecture.date).toLocaleDateString('en-GB')}
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>الوقت:</strong> ${data.lecture.start_time} - ${data.lecture.end_time}
                                </div>
                                <div class="col-md-6">
                                    <strong>عدد الحضور:</strong> <span class="badge bg-primary">${data.attendance?.length || data.statistics?.total_attendance || 0}</span>
                                </div>
                            </div>
                            
                            ${(data.attendance?.length || 0) > 0 ? `
                            <h6>قائمة الحضور:</h6>
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>اسم الطالب</th>
                                            <th>الرقم الجامعي</th>
                                            <th>الجروب</th>
                                            ${data.lecture.lecture_type === 'section' ? '<th>السكشن</th>' : ''}
                                            <th>وقت الحضور</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(data.attendance || []).map(record => `
                                            <tr>
                                                <td>${record.student_name}</td>
                                                <td>${record.student_id}</td>
                                                <td>${record.group_number || 'غير محدد'}</td>
                                                ${data.lecture.lecture_type === 'section' ? `<td>${record.section_number || 'غير محدد'}</td>` : ''}
                                                <td>${new Date(record.timestamp).toLocaleString('en-GB')}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ` : '<p class="text-muted">لا يوجد حضور مسجل لهذه المحاضرة</p>'}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                            <button type="button" class="btn btn-warning-modern btn-modern" onclick="showAttendanceAttempts(${lectureId}, '${data.lecture.title}')">
                                <i class="fas fa-exclamation-triangle me-2"></i>محاولات الدخول
                            </button>
                            ${(data.attendance?.length || 0) > 0 ? `
                            <a href="/api/admin/export/${lectureId}" class="btn btn-primary-modern btn-modern">
                                <i class="fas fa-download me-2"></i>تحميل Excel
                            </a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            
            modal.addEventListener('hidden.bs.modal', () => {
                document.body.removeChild(modal);
            });
        } else {
            console.error('API returned success: false', data);
            showNotification(data.message || 'خطأ في تحميل إحصائيات المحاضرة', 'error');
        }
    } catch (error) {
        console.error('Error loading lecture stats:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

function logout() {
    fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
    }).then(() => {
        currentAdmin = null;
        showLogin();
        showNotification('تم تسجيل الخروج بنجاح', 'success');
    });
}

// Sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
}

// Filter functions
let filteredLectures = [];

function filterLecturesByLevelAndSubject() {
    const levelId = document.getElementById('lectureLevelFilter')?.value;
    const subjectId = document.getElementById('lectureSubjectFilter')?.value;
    const dateFilter = document.getElementById('lectureDateFilter')?.value;
    
    filteredLectures = lectures.filter(lecture => {
        let matchLevel = true;
        let matchSubject = true;
        let matchDate = true;
        
        if (levelId) {
            // Find the subject for this lecture and check its level
            const subject = subjects.find(s => s.id === lecture.subject_id);
            matchLevel = subject && subject.level_id == levelId;
        }
        
        if (subjectId) {
            matchSubject = lecture.subject_id == subjectId;
        }
        
        if (dateFilter) {
            // Compare lecture date with filter date
            matchDate = lecture.date === dateFilter;
        }
        
        return matchLevel && matchSubject && matchDate;
    });
    
    displayFilteredLectures();
}

function displayFilteredLectures() {
    const container = document.getElementById('lecturesList');
    if (container) {
        const hasFilter = document.getElementById('lectureLevelFilter')?.value || 
                         document.getElementById('lectureSubjectFilter')?.value || 
                         document.getElementById('lectureDateFilter')?.value;
        
        const lecturesToDisplay = filteredLectures.length > 0 || hasFilter 
            ? filteredLectures 
            : lectures;
        
        if (lecturesToDisplay.length === 0 && hasFilter) {
            container.innerHTML = '<div class="text-center text-muted py-4">لا توجد محاضرات تطابق الفلتر المحدد</div>';
        } else {
            container.innerHTML = renderLecturesListFiltered(lecturesToDisplay);
        }
    }
}

function resetLectureFilters() {
    const levelFilter = document.getElementById('lectureLevelFilter');
    const subjectFilter = document.getElementById('lectureSubjectFilter');
    const dateFilter = document.getElementById('lectureDateFilter');
    
    if (levelFilter) levelFilter.value = '';
    if (subjectFilter) subjectFilter.value = '';
    if (dateFilter) {
        // Reset to today's date instead of empty
        dateFilter.value = new Date().toISOString().split('T')[0];
    }
    
    // Trigger filter with today's date
    filterLecturesByLevelAndSubject();
}

function setDefaultDateFilter() {
    const dateFilter = document.getElementById('lectureDateFilter');
    if (dateFilter) {
        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        dateFilter.value = today;
        
        // Apply the filter immediately to show today's lectures
        setTimeout(() => {
            filterLecturesByLevelAndSubject();
        }, 100);
    }
}

function renderLecturesListFiltered(lecturesToRender) {
    // Store original lectures temporarily
    const originalLectures = lectures;
    // Replace with filtered lectures
    lectures = lecturesToRender;
    // Get the rendered HTML
    const renderedHTML = renderLecturesList();
    // Restore original lectures
    lectures = originalLectures;
    return renderedHTML;
}

// OLD VERSION - KEPT FOR REFERENCE BUT NOT USED
function renderLecturesListFiltered_OLD(lecturesToRender) {
    if (lecturesToRender.length === 0) {
        return '<div class="text-center text-muted py-4">لا توجد محاضرات</div>';
    }
    
    return lecturesToRender.map(lecture => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h6 class="card-title">${lecture.title}</h6>
                        <p class="card-text text-muted">
                            <strong>المادة:</strong> ${lecture.subject_name}<br>
                            ${lecture.created_by_name ? `<strong>الدكتور:</strong> ${lecture.created_by_name}<br>` : ''}
                            <strong>النوع:</strong> ${lecture.lecture_type === 'lecture' ? 'محاضرة' : 'سكشن'}<br>
                            ${lecture.group_number ? `<strong>الجروب:</strong> ${lecture.group_number}<br>` : ''}
                            ${lecture.section_number ? `<strong>السكشن:</strong> ${lecture.section_number}<br>` : ''}
                            <strong>التاريخ:</strong> ${new Date(lecture.date).toLocaleDateString('en-GB')}<br>
                            <strong>الوقت:</strong> ${lecture.start_time} - ${lecture.end_time}
                        </p>
                        <div class="mt-2">
                            ${lecture.attendance_finished ? '<span class="badge bg-warning me-2">انتهى الحضور</span>' : ''}
                            <span class="badge badge-modern ${lecture.lecture_finished ? 'bg-secondary' : 'bg-success'}">
                                ${lecture.lecture_finished ? 'انتهت المحاضرة' : 'نشطة'}
                            </span>
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="btn-group-vertical d-grid gap-1">
                            <div class="btn-group">
                                <button class="btn btn-sm btn-primary-modern" onclick="showQRCode('${lecture.qr_code}')">
                                    <i class="fas fa-qrcode me-1"></i>عرض QR
                                </button>
                                <button class="btn btn-sm btn-info-modern" onclick="showQRCodeFullscreen('${lecture.qr_code}')">
                                    <i class="fas fa-expand me-1"></i>شاشة كاملة
                                </button>
                            </div>
                            <button class="btn btn-sm btn-success-modern" onclick="showManualAttendanceModal(${lecture.id}, '${lecture.title}', '${lecture.lecture_type}')">
                                <i class="fas fa-user-plus me-1"></i>إضافة حضور يدوي
                            </button>
                            <button class="btn btn-sm btn-info-modern" onclick="viewLectureStats(${lecture.id})">
                                <i class="fas fa-chart-bar me-1"></i>إحصائيات
                            </button>
                            <div class="btn-group">
                                <button class="btn btn-sm ${lecture.attendance_finished ? 'btn-success' : 'btn-warning'}" 
                                        onclick="toggleAttendanceStatus(${lecture.id}, ${lecture.attendance_finished})">
                                    <i class="fas ${lecture.attendance_finished ? 'fa-unlock' : 'fa-lock'} me-1"></i>${lecture.attendance_finished ? 'فتح الحضور' : 'إغلاق الحضور'}
                                </button>
                                <button class="btn btn-sm ${lecture.lecture_finished ? 'btn-success' : 'btn-secondary'}" 
                                        onclick="toggleLectureFinished(${lecture.id}, ${lecture.lecture_finished})">
                                    <i class="fas ${lecture.lecture_finished ? 'fa-undo' : 'fa-check'} me-1"></i>${lecture.lecture_finished ? 'إعادة فتح' : 'إنهاء المحاضرة'}
                                </button>
                            </div>
                            <button class="btn btn-sm btn-danger-modern" onclick="deleteLecture(${lecture.id})">
                                <i class="fas fa-trash me-1"></i>حذف
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Modal functions for Super Admin
async function showCreateDoctorModal() {
    // Load subjects for the dropdown
    try {
        const response = await fetch('/api/admin/subjects/all', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            const subjectContainer = document.getElementById('doctorSubjectsContainer');
            if (subjectContainer) {
                subjectContainer.innerHTML = '';
                
                data.subjects.forEach(subject => {
                    const checkbox = document.createElement('div');
                    checkbox.className = 'form-check';
                    checkbox.innerHTML = `
                        <input class="form-check-input" type="checkbox" value="${subject.id}" id="subject_${subject.id}" name="subject_ids">
                        <label class="form-check-label" for="subject_${subject.id}">
                            ${subject.name}
                        </label>
                    `;
                    subjectContainer.appendChild(checkbox);
                });
            }
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
    
    // Clear form
    document.getElementById('createDoctorForm').reset();
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('createDoctorModal'));
    modal.show();
}

async function showCreateSubjectModal() {
    // Load levels for the dropdown
    try {
        const levelsResponse = await fetch('/api/admin/levels', {
            credentials: 'include'
        });
        const levelsData = await levelsResponse.json();
        
        if (levelsData.success) {
            const levelSelect = document.getElementById('subjectLevelId');
            levelSelect.innerHTML = '<option value="">اختر المرحلة الدراسية</option>';
            
            levelsData.levels.forEach(level => {
                const option = document.createElement('option');
                option.value = level.id;
                option.textContent = level.name;
                levelSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading levels:', error);
    }
    
    // Load doctors for the dropdown
    try {
        const response = await fetch('/api/admin/doctors', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            const adminSelect = document.getElementById('subjectAdminId');
            adminSelect.innerHTML = '<option value="">اختر الدكتور المسؤول (اختياري)</option>';
            
            data.doctors.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor.id;
                option.textContent = doctor.full_name || doctor.username;
                adminSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
    }
    
    // Clear form
    document.getElementById('createSubjectForm').reset();
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('createSubjectModal'));
    modal.show();
}

// Create Doctor Function
async function createDoctor() {
    const username = document.getElementById('doctorUsername').value;
    const password = document.getElementById('doctorPassword').value;
    const fullName = document.getElementById('doctorFullName').value;
    const email = document.getElementById('doctorEmail').value;
    
    // Get selected subject IDs from checkboxes
    const subjectCheckboxes = document.querySelectorAll('input[name="subject_ids"]:checked');
    const subjectIds = Array.from(subjectCheckboxes).map(cb => parseInt(cb.value));
    
    if (!username || !password || !fullName) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'danger');
        return;
    }
    
    if (subjectIds.length === 0) {
        showNotification('يرجى اختيار مادة واحدة على الأقل', 'danger');
        return;
    }
    
    if (password.length < 6) {
        showNotification('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'danger');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/admin/doctors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                username: username,
                password: password,
                full_name: fullName,
                email: email || null,
                subject_ids: subjectIds
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification('تم إنشاء حساب الدكتور بنجاح!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createDoctorModal'));
            modal.hide();
            
            // Refresh doctors list
            await loadDoctors();
        } else {
            showNotification(data.message || 'خطأ في إنشاء حساب الدكتور', 'danger');
        }
    } catch (error) {
        hideLoading();
        console.error('Error creating doctor:', error);
        showNotification('خطأ في الاتصال بالخادم', 'danger');
    }
}

// Create Subject Function
async function createSubject() {
    const name = document.getElementById('subjectName').value;
    const code = document.getElementById('subjectCode').value;
    const description = document.getElementById('subjectDescription').value;
    const levelId = document.getElementById('subjectLevelId').value;
    const adminId = document.getElementById('subjectAdminId').value;
    
    if (!name) {
        showNotification('يرجى إدخال اسم المادة', 'danger');
        return;
    }
    
    if (!levelId) {
        showNotification('يرجى اختيار المرحلة الدراسية', 'danger');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/admin/subjects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                name: name,
                code: code || null,
                description: description || null,
                level_id: levelId,
                admin_id: adminId || null
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification('تم إنشاء المادة بنجاح!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createSubjectModal'));
            modal.hide();
            
            // Refresh subjects list
            await loadSubjects();
        } else {
            showNotification(data.message || 'خطأ في إنشاء المادة', 'danger');
        }
    } catch (error) {
        hideLoading();
        console.error('Error creating subject:', error);
        showNotification('خطأ في الاتصال بالخادم', 'danger');
    }
}

// Edit Doctor Function
async function editDoctor(id) {
    try {
        // Find the doctor data
        const doctor = doctors.find(d => d.id === id);
        if (!doctor) {
            showNotification('الدكتور غير موجود', 'error');
            return;
        }

        // Load subjects for dropdown
        const subjectsResponse = await fetch('/api/admin/subjects/all', {
            credentials: 'include'
        });
        const subjectsData = await subjectsResponse.json();
        
        if (subjectsData.success) {
            const subjectContainer = document.getElementById('editDoctorSubjectsContainer');
            if (subjectContainer) {
                subjectContainer.innerHTML = '';
                
                const assignedSubjectIds = doctor.subjects_ids ? doctor.subjects_ids.split(',').map(id => parseInt(id)) : [];
                
                subjectsData.subjects.forEach(subject => {
                    const checkbox = document.createElement('div');
                    checkbox.className = 'form-check';
                    checkbox.innerHTML = `
                        <input class="form-check-input" type="checkbox" value="${subject.id}" id="edit_subject_${subject.id}" name="edit_subject_ids" ${assignedSubjectIds.includes(subject.id) ? 'checked' : ''}>
                        <label class="form-check-label" for="edit_subject_${subject.id}">
                            ${subject.name}
                        </label>
                    `;
                    subjectContainer.appendChild(checkbox);
                });
            }
        }

        // Fill the form
        document.getElementById('editDoctorId').value = doctor.id;
        document.getElementById('editDoctorUsername').value = doctor.username;
        document.getElementById('editDoctorFullName').value = doctor.full_name || '';
        document.getElementById('editDoctorEmail').value = doctor.email || '';
        document.getElementById('editDoctorActive').value = doctor.is_active ? '1' : '0';
        document.getElementById('editDoctorPassword').value = '';

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editDoctorModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading doctor for edit:', error);
        showNotification('خطأ في تحميل بيانات الدكتور', 'error');
    }
}

// Update Doctor Function
async function updateDoctor() {
    const id = document.getElementById('editDoctorId').value;
    const fullName = document.getElementById('editDoctorFullName').value;
    const email = document.getElementById('editDoctorEmail').value;
    const isActive = document.getElementById('editDoctorActive').value === '1';
    const password = document.getElementById('editDoctorPassword').value;
    
    // Get selected subject IDs from checkboxes
    const subjectCheckboxes = document.querySelectorAll('input[name="edit_subject_ids"]:checked');
    const subjectIds = Array.from(subjectCheckboxes).map(cb => parseInt(cb.value));

    if (!fullName) {
        showNotification('يرجى إدخال الاسم رباعي', 'danger');
        return;
    }
    
    if (subjectIds.length === 0) {
        showNotification('يرجى اختيار مادة واحدة على الأقل', 'danger');
        return;
    }

    try {
        showLoading();
        
        const response = await fetch(`/api/admin/doctors/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                full_name: fullName,
                email: email || null,
                subject_ids: subjectIds,
                is_active: isActive,
                password: password || null
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification('تم تحديث بيانات الدكتور بنجاح!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editDoctorModal'));
            modal.hide();
            
            // Refresh doctors list
            await loadDoctors();
        } else {
            showNotification(data.message || 'خطأ في تحديث بيانات الدكتور', 'danger');
        }
    } catch (error) {
        hideLoading();
        console.error('Error updating doctor:', error);
        showNotification('خطأ في الاتصال بالخادم', 'danger');
    }
}

// Delete Doctor Function
async function deleteDoctor(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الدكتور؟\n\nهذا الإجراء سيحذف جميع محاضراته وسجلات الحضور المرتبطة بها!\nولا يمكن التراجع عنه!')) {
        return;
    }

    try {
        showLoading();
        
        const response = await fetch(`/api/admin/doctors/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification('تم حذف الدكتور بنجاح!', 'success');
            await loadDoctors(); // Refresh list
        } else {
            showNotification(data.message || 'خطأ في حذف الدكتور', 'danger');
        }
    } catch (error) {
        hideLoading();
        console.error('Error deleting doctor:', error);
        showNotification('خطأ في الاتصال بالخادم', 'danger');
    }
}

// Edit Subject Function
async function editSubject(id) {
    try {
        // Find the subject data
        const subject = subjects.find(s => s.id === id);
        if (!subject) {
            showNotification('المادة غير موجودة', 'error');
            return;
        }

        // Load levels for dropdown
        const levelsResponse = await fetch('/api/admin/levels', {
            credentials: 'include'
        });
        const levelsData = await levelsResponse.json();
        
        if (levelsData.success) {
            const levelSelect = document.getElementById('editSubjectLevelId');
            levelSelect.innerHTML = '<option value="">اختر المرحلة الدراسية</option>';
            
            levelsData.levels.forEach(level => {
                const option = document.createElement('option');
                option.value = level.id;
                option.textContent = level.name;
                if (subject.level_id == level.id) {
                    option.selected = true;
                }
                levelSelect.appendChild(option);
            });
        }

        // Load doctors for dropdown
        const doctorsResponse = await fetch('/api/admin/doctors', {
            credentials: 'include'
        });
        const doctorsData = await doctorsResponse.json();
        
        if (doctorsData.success) {
            const adminSelect = document.getElementById('editSubjectAdminId');
            adminSelect.innerHTML = '<option value="">اختر الدكتور المسؤول (اختياري)</option>';
            
            doctorsData.doctors.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor.id;
                option.textContent = doctor.full_name || doctor.username;
                if (subject.admin_id == doctor.id) {
                    option.selected = true;
                }
                adminSelect.appendChild(option);
            });
        }

        // Fill the form
        document.getElementById('editSubjectId').value = subject.id;
        document.getElementById('editSubjectName').value = subject.name;
        document.getElementById('editSubjectCode').value = subject.code || '';
        document.getElementById('editSubjectDescription').value = subject.description || '';
        document.getElementById('editSubjectActive').value = subject.is_active ? '1' : '0';

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editSubjectModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading subject for edit:', error);
        showNotification('خطأ في تحميل بيانات المادة', 'error');
    }
}

// Update Subject Function
async function updateSubject() {
    const id = document.getElementById('editSubjectId').value;
    const name = document.getElementById('editSubjectName').value;
    const code = document.getElementById('editSubjectCode').value;
    const description = document.getElementById('editSubjectDescription').value;
    const levelId = document.getElementById('editSubjectLevelId').value;
    const adminId = document.getElementById('editSubjectAdminId').value;
    const isActive = document.getElementById('editSubjectActive').value === '1';

    if (!name) {
        showNotification('يرجى إدخال اسم المادة', 'danger');
        return;
    }

    if (!levelId) {
        showNotification('يرجى اختيار المرحلة الدراسية', 'danger');
        return;
    }

    try {
        showLoading();
        
        const response = await fetch(`/api/admin/subjects/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                name: name,
                code: code || null,
                description: description || null,
                level_id: levelId,
                admin_id: adminId || null,
                is_active: isActive
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification('تم تحديث بيانات المادة بنجاح!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editSubjectModal'));
            modal.hide();
            
            // Refresh subjects list
            await loadSubjects();
        } else {
            showNotification(data.message || 'خطأ في تحديث بيانات المادة', 'danger');
        }
    } catch (error) {
        hideLoading();
        console.error('Error updating subject:', error);
        showNotification('خطأ في الاتصال بالخادم', 'danger');
    }
}

// Delete Subject Function
async function deleteSubject(id) {
    if (!confirm('هل أنت متأكد من حذف هذه المادة؟\n\nهذا الإجراء سيحذف جميع المحاضرات والحضور المرتبطة بها!\nولا يمكن التراجع عنه!')) {
        return;
    }

    try {
        showLoading();
        
        const response = await fetch(`/api/admin/subjects/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification('تم حذف المادة بنجاح!', 'success');
            await loadSubjects(); // Refresh list
        } else {
            showNotification(data.message || 'خطأ في حذف المادة', 'danger');
        }
    } catch (error) {
        hideLoading();
        console.error('Error deleting subject:', error);
        showNotification('خطأ في الاتصال بالخادم', 'danger');
    }
}

// Profile Management
async function loadProfileData() {
    const profileTab = document.getElementById('profileTab');
    
    try {
        const response = await fetch('/api/admin/profile', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderProfileTab(data.profile);
        } else {
            profileTab.innerHTML = '<div class="alert alert-danger">خطأ في تحميل بيانات البروفايل</div>';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        profileTab.innerHTML = '<div class="alert alert-danger">خطأ في الاتصال بالخادم</div>';
    }
}

function renderProfileTab(profile) {
    const profileTab = document.getElementById('profileTab');
    
    const initials = profile.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : profile.username.substring(0, 2).toUpperCase();
    const roleText = profile.role === 'super_admin' ? 'مدير عام' : 'دكتور';
    const roleIcon = profile.role === 'super_admin' ? 'fa-user-shield' : 'fa-user-tie';
    
    const content = `
        <!-- Profile Header -->
        <div class="profile-header-modern">
            <div class="profile-header-bg"></div>
            <div class="profile-header-content">
                <div class="profile-avatar-container">
                    <div class="profile-avatar-modern">
                        <span class="avatar-initials">${initials}</span>
                        <div class="avatar-status ${profile.is_active ? 'status-active' : 'status-inactive'}"></div>
                    </div>
                </div>
                <div class="profile-header-info">
                    <h2 class="profile-name">${profile.full_name || profile.username}</h2>
                    <div class="profile-role">
                        <i class="fas ${roleIcon}"></i>
                        <span>${roleText}</span>
                    </div>
                    <div class="profile-meta">
                        <div class="meta-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>انضم في ${formatArabicDate(profile.created_at)}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>آخر تحديث: ${new Date().toLocaleDateString('ar-EG')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Profile Content -->
        <div class="profile-content-modern">
            <div class="row g-4">
                <!-- Left Column - Main Info -->
                <div class="col-lg-8">
                    <!-- Personal Information Card -->
                    <div class="profile-card-modern">
                        <div class="profile-card-header">
                            <div class="header-left">
                                <div class="header-icon">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="header-title">
                                    <h3>المعلومات الشخصية</h3>
                                    <p>قم بتحديث معلوماتك الأساسية</p>
                                </div>
                            </div>
                        </div>
                        <div class="profile-card-body">
                            <form id="profileForm">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <div class="form-group-modern">
                                            <label class="form-label-modern">
                                                <i class="fas fa-user-circle"></i>
                                                اسم المستخدم
                                            </label>
                                            <input type="text" class="form-input-modern" 
                                                   value="${profile.username}" readonly>
                                            <div class="input-hint">لا يمكن تغيير اسم المستخدم</div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group-modern">
                                            <label class="form-label-modern">
                                                <i class="fas fa-shield-alt"></i>
                                                الدور الوظيفي
                                            </label>
                                            <input type="text" class="form-input-modern" 
                                                   value="${roleText}" readonly>
                                            <div class="input-hint">الصلاحيات المخصصة لحسابك</div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group-modern">
                                            <label class="form-label-modern">
                                                <i class="fas fa-signature"></i>
                                                الاسم الكامل *
                                            </label>
                                            <input type="text" class="form-input-modern" id="profileFullName" 
                                                   value="${profile.full_name || ''}" required 
                                                   placeholder="أدخل الاسم الكامل">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group-modern">
                                            <label class="form-label-modern">
                                                <i class="fas fa-envelope"></i>
                                                البريد الإلكتروني
                                            </label>
                                            <input type="email" class="form-input-modern" id="profileEmail" 
                                                   value="${profile.email || ''}"
                                                   placeholder="example@domain.com">
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Security Card -->
                    <div class="profile-card-modern mt-4">
                        <div class="profile-card-header">
                            <div class="header-left">
                                <div class="header-icon security-icon">
                                    <i class="fas fa-lock"></i>
                                </div>
                                <div class="header-title">
                                    <h3>الأمان وكلمة المرور</h3>
                                    <p>حدث كلمة المرور للحفاظ على أمان حسابك</p>
                                </div>
                            </div>
                        </div>
                        <div class="profile-card-body">
                            <div class="security-notice">
                                <i class="fas fa-info-circle"></i>
                                <span>استخدم كلمة مرور قوية تحتوي على أحرف وأرقام ورموز</span>
                            </div>
                            <div class="row g-3 mt-3">
                                <div class="col-md-6">
                                    <div class="form-group-modern">
                                        <label class="form-label-modern">
                                            <i class="fas fa-key"></i>
                                            كلمة المرور الحالية
                                        </label>
                                        <input type="password" class="form-input-modern" id="profileOldPassword"
                                               placeholder="أدخل كلمة المرور الحالية">
                                        <div class="input-hint">مطلوبة لتغيير كلمة المرور</div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group-modern">
                                        <label class="form-label-modern">
                                            <i class="fas fa-lock"></i>
                                            كلمة المرور الجديدة
                                        </label>
                                        <input type="password" class="form-input-modern" id="profileNewPassword"
                                               placeholder="أدخل كلمة المرور الجديدة">
                                        <div class="input-hint">اتركها فارغة إذا لم ترد التغيير</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Save Button -->
                    <div class="profile-actions mt-4">
                        <button type="button" class="btn-save-profile" onclick="updateProfile()">
                            <i class="fas fa-save"></i>
                            <span>حفظ التغييرات</span>
                            <div class="btn-ripple"></div>
                        </button>
                    </div>
                </div>

                <!-- Right Column - Stats & Info -->
                <div class="col-lg-4">
                    <!-- Account Status Card -->
                    <div class="profile-card-modern">
                        <div class="profile-card-header">
                            <div class="header-left">
                                <div class="header-icon info-icon">
                                    <i class="fas fa-chart-line"></i>
                                </div>
                                <div class="header-title">
                                    <h3>حالة الحساب</h3>
                                </div>
                            </div>
                        </div>
                        <div class="profile-card-body">
                            <div class="status-item">
                                <div class="status-icon">
                                    <i class="fas fa-toggle-${profile.is_active ? 'on' : 'off'}"></i>
                                </div>
                                <div class="status-content">
                                    <span class="status-label">حالة الحساب</span>
                                    <span class="status-badge ${profile.is_active ? 'badge-active' : 'badge-inactive'}">
                                        ${profile.is_active ? 'نشط' : 'معطل'}
                                    </span>
                                </div>
                            </div>
                            <div class="status-item">
                                <div class="status-icon">
                                    <i class="fas fa-calendar-check"></i>
                                </div>
                                <div class="status-content">
                                    <span class="status-label">تاريخ الإنشاء</span>
                                    <span class="status-value">${formatArabicDate(profile.created_at)}</span>
                                </div>
                            </div>
                            <div class="status-item">
                                <div class="status-icon">
                                    <i class="fas fa-id-badge"></i>
                                </div>
                                <div class="status-content">
                                    <span class="status-label">معرف الحساب</span>
                                    <span class="status-value">#${profile.id}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${profile.subject_name ? `
                    <!-- Subject Info Card -->
                    <div class="profile-card-modern mt-4">
                        <div class="profile-card-header">
                            <div class="header-left">
                                <div class="header-icon subject-icon">
                                    <i class="fas fa-book"></i>
                                </div>
                                <div class="header-title">
                                    <h3>المادة المخصصة</h3>
                                </div>
                            </div>
                        </div>
                        <div class="profile-card-body">
                            <div class="subject-info-modern">
                                <div class="subject-name">${profile.subject_name}</div>
                                <div class="subject-code">
                                    <i class="fas fa-hashtag"></i>
                                    ${profile.subject_code || 'غير محدد'}
                                </div>
                                ${profile.subject_description ? `
                                <div class="subject-description">
                                    <i class="fas fa-info-circle"></i>
                                    ${profile.subject_description}
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Quick Tips Card -->
                    <div class="profile-card-modern mt-4 tips-card">
                        <div class="profile-card-header">
                            <div class="header-left">
                                <div class="header-icon tips-icon">
                                    <i class="fas fa-lightbulb"></i>
                                </div>
                                <div class="header-title">
                                    <h3>نصائح سريعة</h3>
                                </div>
                            </div>
                        </div>
                        <div class="profile-card-body">
                            <div class="tip-item">
                                <i class="fas fa-check-circle"></i>
                                <span>حدث معلوماتك بانتظام</span>
                            </div>
                            <div class="tip-item">
                                <i class="fas fa-check-circle"></i>
                                <span>استخدم كلمة مرور قوية</span>
                            </div>
                            <div class="tip-item">
                                <i class="fas fa-check-circle"></i>
                                <span>تأكد من صحة بريدك الإلكتروني</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    profileTab.innerHTML = content;
}

async function updateProfile() {
    const fullName = document.getElementById('profileFullName').value;
    const email = document.getElementById('profileEmail').value;
    const oldPassword = document.getElementById('profileOldPassword').value;
    const newPassword = document.getElementById('profileNewPassword').value;
    
    if (!fullName.trim()) {
        showNotification('يرجى إدخال الاسم رباعي', 'warning');
        return;
    }
    
    if (newPassword && !oldPassword) {
        showNotification('يرجى إدخال كلمة المرور الحالية لتغييرها', 'warning');
        return;
    }
    
    if (newPassword && newPassword.length < 6) {
        showNotification('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'warning');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/admin/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                full_name: fullName,
                email: email || null,
                old_password: oldPassword || null,
                new_password: newPassword || null
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification('تم تحديث البروفايل بنجاح!', 'success');
            
            // Clear password fields
            document.getElementById('profileOldPassword').value = '';
            document.getElementById('profileNewPassword').value = '';
            
            // Update current admin data
            if (currentAdmin) {
                currentAdmin.full_name = fullName;
            }
            
            // Update UI
            document.getElementById('userName').textContent = fullName;
        } else {
            showNotification(data.message || 'خطأ في تحديث البروفايل', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error updating profile:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// New lecture management functions
async function deleteLecture(lectureId) {
    if (!confirm('هل أنت متأكد من حذف هذه المحاضرة؟\n\nهذا الإجراء سيحذف جميع بيانات الحضور المرتبطة بها!')) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`/api/admin/lectures/${lectureId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification('تم حذف المحاضرة بنجاح!', 'success');
            await loadLectures();
        } else {
            showNotification(data.message || 'خطأ في حذف المحاضرة', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error deleting lecture:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// Show manual attendance modal
function showManualAttendanceModal(lectureId, lectureTitle, lectureType) {
    const modalHTML = `
        <div class="modal fade" id="manualAttendanceModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary-modern text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-user-plus me-2"></i>إضافة حضور يدوي
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted mb-3">المحاضرة: <strong>${lectureTitle}</strong></p>
                        <form id="manualAttendanceForm">
                            <input type="hidden" id="manualLectureId" value="${lectureId}">
                            <input type="hidden" id="manualLectureType" value="${lectureType}">
                            
                            <div class="mb-3">
                                <label class="form-label fw-bold">كود الطالب *</label>
                                <input type="text" class="form-control form-control-modern" id="manualStudentId" required>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label fw-bold">اسم الطالب *</label>
                                <input type="text" class="form-control form-control-modern" id="manualStudentName" required>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label fw-bold">رقم الجروب *</label>
                                <input type="text" class="form-control form-control-modern" id="manualGroupNumber" required>
                            </div>
                            
                            <div class="mb-3 ${lectureType === 'lecture' ? 'd-none' : ''}">
                                <label class="form-label fw-bold">رقم السكشن ${lectureType === 'section' ? '*' : ''}</label>
                                <input type="text" class="form-control form-control-modern" id="manualSectionNumber" ${lectureType === 'section' ? 'required' : ''}>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary-modern" onclick="submitManualAttendance()">
                            <i class="fas fa-check me-1"></i>تسجيل الحضور
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('manualAttendanceModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('manualAttendanceModal'));
    modal.show();
}

// Submit manual attendance
async function submitManualAttendance() {
    const lectureId = document.getElementById('manualLectureId').value;
    const lectureType = document.getElementById('manualLectureType').value;
    const studentId = document.getElementById('manualStudentId').value.trim();
    const studentName = document.getElementById('manualStudentName').value.trim();
    const groupNumber = document.getElementById('manualGroupNumber').value.trim();
    const sectionNumber = document.getElementById('manualSectionNumber').value.trim();
    
    // Validation
    if (!studentId || !studentName || !groupNumber) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    if (lectureType === 'section' && !sectionNumber) {
        showNotification('رقم السكشن مطلوب', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/admin/attendance/manual', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                lecture_id: lectureId,
                student_id: studentId,
                student_name: studentName,
                group_number: groupNumber,
                section_number: sectionNumber || null
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification('تم تسجيل الحضور بنجاح!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('manualAttendanceModal'));
            modal.hide();
            
            // Reset form
            document.getElementById('manualAttendanceForm').reset();
        } else {
            showNotification(data.message || 'خطأ في تسجيل الحضور', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error submitting manual attendance:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// Show attendance attempts modal (successful and failed)
async function showAttendanceAttempts(lectureId, lectureTitle) {
    try {
        showLoading();
        
        const response = await fetch(`/api/admin/statistics/lecture/${lectureId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            hideLoading();
            showNotification('خطأ في تحميل البيانات', 'error');
            return;
        }
        
        const data = await response.json();
        hideLoading();
        
        if (!data.success) {
            showNotification(data.message || 'خطأ في تحميل البيانات', 'error');
            return;
        }
        
        const successfulAttempts = data.attendance || [];
        const failedAttempts = data.failedAttempts || [];
        
        const modalHTML = `
            <div class="modal fade" id="attendanceAttemptsModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-clipboard-list me-2"></i>محاولات الدخول - ${lectureTitle}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Summary Cards -->
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <div class="card border-success">
                                        <div class="card-body text-center">
                                            <i class="fas fa-check-circle fa-3x text-success mb-2"></i>
                                            <h3 class="text-success">${successfulAttempts.length}</h3>
                                            <p class="mb-0">محاولات ناجحة</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card border-danger">
                                        <div class="card-body text-center">
                                            <i class="fas fa-times-circle fa-3x text-danger mb-2"></i>
                                            <h3 class="text-danger">${failedAttempts.length}</h3>
                                            <p class="mb-0">محاولات فاشلة</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Search Box -->
                            <div class="mb-3">
                                <div class="search-box-stats">
                                    <i class="fas fa-search"></i>
                                    <input type="text" id="searchAttendance" class="search-input-stats" placeholder="ابحث عن طالب (الاسم أو الرقم الجامعي)..." oninput="filterAttendanceList()">
                                </div>
                            </div>
                            
                            <!-- Tabs for Successful and Failed Attempts -->
                            <ul class="nav nav-tabs mb-3" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#successfulTab" type="button" onclick="filterAttendanceList()">
                                        <i class="fas fa-check text-success me-1"></i>المحاولات الناجحة (<span id="successCount">${successfulAttempts.length}</span>)
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#failedTab" type="button" onclick="filterAttendanceList()">
                                        <i class="fas fa-times text-danger me-1"></i>المحاولات الفاشلة (<span id="failedCount">${failedAttempts.length}</span>)
                                    </button>
                                </li>
                            </ul>
                            
                            <div class="tab-content">
                                <!-- Successful Attempts Tab -->
                                <div class="tab-pane fade show active" id="successfulTab">
                                    ${successfulAttempts.length > 0 ? `
                                    <div class="table-responsive">
                                        <table class="table table-striped table-hover">
                                            <thead class="table-success">
                                                <tr>
                                                    <th>#</th>
                                                    <th>اسم الطالب</th>
                                                    <th>الرقم الجامعي</th>
                                                    <th>الجروب</th>
                                                    <th>السكشن</th>
                                                    <th>وقت التسجيل</th>
                                                </tr>
                                            </thead>
                                            <tbody id="successfulTableBody">
                                                ${successfulAttempts.map((record, index) => `
                                                    <tr class="attendance-row" data-student-name="${(record.student_name || '').toLowerCase()}" data-student-id="${(record.student_id || '').toLowerCase()}">
                                                        <td>${index + 1}</td>
                                                        <td><strong>${record.student_name}</strong></td>
                                                        <td>${record.student_id}</td>
                                                        <td><span class="badge bg-info">${record.group_number || 'غير محدد'}</span></td>
                                                        <td><span class="badge bg-secondary">${record.section_number || 'غير محدد'}</span></td>
                                                        <td>${new Date(record.timestamp).toLocaleString('ar-EG')}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                    ` : '<p class="text-muted text-center py-4">لا توجد محاولات ناجحة</p>'}
                                </div>
                                
                                <!-- Failed Attempts Tab -->
                                <div class="tab-pane fade" id="failedTab">
                                    ${failedAttempts.length > 0 ? `
                                    <div class="alert alert-info mb-3">
                                        <i class="fas fa-info-circle me-2"></i>
                                        يمكنك قبول الطالب وتحويل المحاولة الفاشلة إلى ناجحة بالضغط على زر "قبول الطالب"
                                    </div>
                                    <div class="table-responsive">
                                        <table class="table table-striped table-hover">
                                            <thead class="table-danger">
                                                <tr>
                                                    <th>#</th>
                                                    <th>اسم الطالب</th>
                                                    <th>الرقم الجامعي</th>
                                                    <th>الجروب</th>
                                                    <th>السكشن</th>
                                                    <th>سبب الفشل</th>
                                                    <th>الوقت</th>
                                                    <th>إجراء</th>
                                                </tr>
                                            </thead>
                                            <tbody id="failedAttemptsTableBody">
                                                ${failedAttempts.map((record, index) => `
                                                    <tr id="failed-row-${record.id}" class="attendance-row" data-student-name="${(record.student_name || '').toLowerCase()}" data-student-id="${(record.student_id || '').toLowerCase()}">
                                                        <td>${index + 1}</td>
                                                        <td><strong>${record.student_name || 'غير متوفر'}</strong></td>
                                                        <td>${record.student_id}</td>
                                                        <td><span class="badge bg-info">${record.group_number || 'غير محدد'}</span></td>
                                                        <td><span class="badge bg-info">${record.section_number || 'غير محدد'}</span></td>
                                                        <td>
                                                            <span class="badge bg-danger">
                                                                ${record.reason === 'Duplicate registration attempt' ? 'محاولة تسجيل مكررة' :
                                                                  record.reason === 'Session already used' ? 'الجهاز مستخدم من قبل' :
                                                                  record.reason === 'Registration failed' ? 'فشل في التسجيل' :
                                                                  record.reason}
                                                            </span>
                                                        </td>
                                                        <td>${new Date(record.timestamp).toLocaleString('ar-EG')}</td>
                                                        <td>
                                                            <button class="btn btn-sm btn-success" 
                                                                    onclick="acceptFailedAttempt(${lectureId}, '${record.student_id}', ${record.id}, '${record.student_name || 'الطالب'}')">
                                                                <i class="fas fa-check me-1"></i>قبول الطالب
                                                            </button>
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                    ` : '<p class="text-muted text-center py-4">لا توجد محاولات فاشلة</p>'}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('attendanceAttemptsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('attendanceAttemptsModal'));
        modal.show();
        
    } catch (error) {
        hideLoading();
        console.error('Error loading attendance attempts:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// Accept failed attempt and convert to successful
async function acceptFailedAttempt(lectureId, studentId, failedAttemptId, studentName) {
    // Confirm action
    if (!confirm(`هل أنت متأكد من قبول الطالب "${studentName}" وتسجيل حضوره؟`)) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/admin/attendance/accept-failed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                lecture_id: lectureId,
                student_id: studentId,
                failed_attempt_id: failedAttemptId
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification('تم قبول الطالب وتسجيل حضوره بنجاح! ✅', 'success');
            
            // Remove the row from failed attempts table with animation
            const row = document.getElementById(`failed-row-${failedAttemptId}`);
            if (row) {
                row.style.backgroundColor = '#d4edda';
                row.style.transition = 'all 0.5s ease';
                setTimeout(() => {
                    row.style.opacity = '0';
                    setTimeout(() => {
                        row.remove();
                        
                        // Check if table is now empty
                        const tbody = document.getElementById('failedAttemptsTableBody');
                        if (tbody && tbody.children.length === 0) {
                            document.getElementById('failedTab').innerHTML = 
                                '<p class="text-muted text-center py-4">لا توجد محاولات فاشلة</p>';
                        }
                    }, 500);
                }, 500);
            }
            
            // Update the successful attempts count in the UI
            setTimeout(() => {
                // Optionally reload the modal to show updated counts
                const modal = bootstrap.Modal.getInstance(document.getElementById('attendanceAttemptsModal'));
                if (modal) {
                    modal.hide();
                    // Reload after a short delay
                    setTimeout(() => {
                        showAttendanceAttempts(lectureId, 'المحاضرة');
                    }, 300);
                }
            }, 1500);
            
        } else {
            showNotification(data.message || 'خطأ في قبول الطالب', 'error');
        }
        
    } catch (error) {
        hideLoading();
        console.error('Error accepting failed attempt:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// Make functions globally accessible
window.showManualAttendanceModal = showManualAttendanceModal;
window.submitManualAttendance = submitManualAttendance;
window.showAttendanceAttempts = showAttendanceAttempts;
window.acceptFailedAttempt = acceptFailedAttempt;
window.resetLectureFilters = resetLectureFilters;
window.showEditQrIntervalModal = showEditQrIntervalModal;
window.updateQrInterval = updateQrInterval;

function showEditQrIntervalModal(lectureId, currentInterval) {
    const modalHTML = `
        <div class="modal fade" id="editQrIntervalModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">تعديل وقت تحديث QR</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>المحاضرة: ${lectures.find(l => l.id === lectureId)?.title}</p>
                        <div class="mb-3">
                            <label class="form-label fw-bold">وقت التحديث (بالثواني)</label>
                            <input type="number" class="form-control form-control-modern" id="newQrInterval" value="${currentInterval || ''}" placeholder="مثال: 30">
                            <small class="text-muted">اتركه فارغاً لعدم التحديث التلقائي</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary-modern" onclick="updateQrInterval(${lectureId})">حفظ</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('editQrIntervalModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('editQrIntervalModal'));
    modal.show();
}

async function updateQrInterval(lectureId) {
    const newInterval = document.getElementById('newQrInterval').value;
    try {
        showLoading();
        const response = await fetch(`/api/admin/lectures/${lectureId}/qr-interval`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ qr_refresh_interval: newInterval })
        });

        const data = await response.json();
        hideLoading();

        if (data.success) {
            showNotification('تم تحديث وقت تحديث QR بنجاح!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('editQrIntervalModal'));
            modal.hide();
            await loadLectures();
        } else {
            showNotification(data.message || 'خطأ في تحديث وقت التحديث', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error updating QR interval:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}


async function toggleAttendanceStatus(lectureId, currentStatus) {
    try {
        showLoading();
        
        const response = await fetch(`/api/admin/lectures/${lectureId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                attendance_finished: !currentStatus
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification(`تم ${!currentStatus ? 'إغلاق' : 'فتح'} الحضور بنجاح!`, 'success');
            await loadLectures();
        } else {
            showNotification(data.message || 'خطأ في تحديث حالة الحضور', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error toggling attendance status:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

async function toggleLectureFinished(lectureId, currentStatus) {
    try {
        showLoading();
        
        const response = await fetch(`/api/admin/lectures/${lectureId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                lecture_finished: !currentStatus
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification(`تم ${!currentStatus ? 'إنهاء' : 'إعادة فتح'} المحاضرة بنجاح!`, 'success');
            await loadLectures();
        } else {
            showNotification(data.message || 'خطأ في تحديث حالة المحاضرة', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error toggling lecture finished status:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

async function showQRCodeFullscreen(lectureId) {
    const lecture = lectures.find(l => l.id === lectureId);
    if (!lecture) {
        showNotification('Lecture not found', 'error');
        return;
    }
    const qrCode = lecture.qr_code;

    try {
        const response = await fetch(`/api/qr/${qrCode}`);
        const data = await response.json();
        
        if (data.success) {
            let qrTimer;
            // Create fullscreen modal
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'qrCodeFullscreenModal';
            modal.innerHTML = `
                <div class="modal-dialog modal-fullscreen">
                    <div class="modal-content bg-dark text-white">
                        <div class="modal-header border-0">
                            <h5 class="modal-title">QR Code - الشاشة الكاملة</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body d-flex justify-content-center align-items-center">
                            <div class="text-center">
                                <img src="data:image/png;base64,${data.qrImage}" id="qrCodeImageFullscreen" alt="QR Code" class="img-fluid" style="max-height: 90vh; max-width: 90vw;">
                                <p class="mt-3 fs-4">QR Code للمحاضرة</p>
                                <div id="qrTimerDisplayFullscreen" class="mt-2 fs-4"></div>
                            </div>
                        </div>
                        <div class="modal-footer border-0">
                            <button class="btn btn-light" onclick="printQRCode()">
                                <i class="fas fa-print me-2"></i>طباعة
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();

            startOrUpdateQrCodeTimer(lecture.id, 'qrCodeImageFullscreen', 'qrTimerDisplayFullscreen');

            modal.addEventListener('hidden.bs.modal', () => {
                clearInterval(qrTimer);
                document.body.removeChild(modal);
            });
        } else {
            showNotification('خطأ في تحميل QR Code', 'error');
        }
    } catch (error) {
        console.error('Error showing QR code fullscreen:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

async function showDoctorStats(doctorId) {
    try {
        console.log('Fetching stats for doctor:', doctorId);
        
        const response = await fetch(`/api/admin/statistics/doctor/${doctorId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', response.status, errorText);
            showNotification(`خطأ في تحميل الإحصائيات: ${response.status}`, 'error');
            return;
        }
        
        const data = await response.json();
        console.log('Doctor stats data:', data);
        
        if (data.success) {
            // Calculate total statistics
            const totalLectures = data.data.length;
            const totalAttendance = data.data.reduce((sum, item) => sum + item.attendance_count, 0);
            
            // Create modal to show doctor statistics
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog modal-xl">
                    <div class="modal-content modal-content-modern">
                        <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <div class="d-flex align-items-center gap-3">
                                <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700;">
                                    ${data.doctor.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h5 class="modal-title mb-0">${data.doctor.name}</h5>
                                    <small style="opacity: 0.9;">إحصائيات الدكتور</small>
                                </div>
                            </div>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" style="background: var(--card-bg);">
                            <div class="row mb-4">
                                <div class="col-md-4 mb-3">
                                    <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                                        <div class="stats-icon" style="background: rgba(255,255,255,0.2);">
                                            <i class="fas fa-chalkboard-teacher"></i>
                                        </div>
                                        <div class="stats-number" style="color: white;">${totalLectures}</div>
                                        <div class="stats-label" style="color: rgba(255,255,255,0.9);">إجمالي المحاضرات</div>
                                    </div>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <div class="stat-card" style="background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%); color: white;">
                                        <div class="stats-icon" style="background: rgba(255,255,255,0.2);">
                                            <i class="fas fa-users"></i>
                                        </div>
                                        <div class="stats-number" style="color: white;">${totalAttendance}</div>
                                        <div class="stats-label" style="color: rgba(255,255,255,0.9);">إجمالي الحضور</div>
                                    </div>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
                                        <div class="stats-icon" style="background: rgba(255,255,255,0.2);">
                                            <i class="fas fa-chart-line"></i>
                                        </div>
                                        <div class="stats-number" style="color: white;">${totalLectures > 0 ? Math.round(totalAttendance / totalLectures) : 0}</div>
                                        <div class="stats-label" style="color: rgba(255,255,255,0.9);">متوسط الحضور</div>
                                    </div>
                                </div>
                            </div>
                            
                            ${data.data.length > 0 ? `
                            <h6 class="mb-3" style="color: var(--text-primary);"><i class="fas fa-list-ul me-2"></i>تفاصيل المحاضرات</h6>
                            <div class="lectures-list">
                                ${data.data.map((item, index) => `
                                    <div class="lecture-detail-card" style="animation-delay: ${index * 0.05}s">
                                        <div class="lecture-detail-header">
                                            <div class="lecture-detail-icon">
                                                <i class="fas fa-book-open"></i>
                                            </div>
                                            <div class="lecture-detail-info">
                                                <div class="lecture-detail-title">${item.title}</div>
                                                <div class="lecture-detail-subject">
                                                    <i class="fas fa-bookmark me-1"></i>${item.subject_name}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="lecture-detail-meta">
                                            <div class="lecture-meta-item">
                                                <i class="fas fa-calendar me-1"></i>
                                                <span>${new Date(item.date).toLocaleDateString('ar-EG')}</span>
                                            </div>
                                            <div class="lecture-meta-item">
                                                <i class="fas fa-clock me-1"></i>
                                                <span>${item.start_time} - ${item.end_time}</span>
                                            </div>
                                            <div class="lecture-meta-item">
                                                <span class="lecture-attendance-badge">${item.attendance_count}</span>
                                                <span>حاضر</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            ` : `
                            <div class="empty-state" style="padding: 60px 20px;">
                                <div class="empty-state-icon"><i class="fas fa-chalkboard-teacher"></i></div>
                                <div class="empty-state-title">لا توجد محاضرات</div>
                                <div class="empty-state-message">لم يتم تسجيل أي محاضرات لهذا الدكتور بعد</div>
                            </div>
                            `}
                        </div>
                        <div class="modal-footer" style="background: var(--card-bg); border-top: 1px solid var(--border-color);">
                            <button type="button" class="btn btn-secondary btn-modern" data-bs-dismiss="modal">
                                <i class="fas fa-times me-2"></i>إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            
            modal.addEventListener('hidden.bs.modal', () => {
                document.body.removeChild(modal);
            });
        } else {
            showNotification('خطأ في تحميل إحصائيات الدكتور', 'error');
        }
    } catch (error) {
        console.error('Error loading doctor stats:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// ==================== LEVELS MANAGEMENT ====================

let levels = [];

async function loadLevels() {
    try {
        const response = await fetch('/api/admin/levels', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            levels = data.levels;
            renderLevelsTab();
        } else {
            showNotification('خطأ في تحميل المراحل', 'error');
        }
    } catch (error) {
        console.error('Error loading levels:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

function renderLevelsTab() {
    const levelsTab = document.getElementById('levelsTab');
    
    if (levels.length === 0) {
        levelsTab.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h4><i class="fas fa-layer-group me-2"></i>إدارة المراحل الدراسية</h4>
                <button class="btn btn-primary-modern btn-modern" onclick="showCreateLevelModal()">
                    <i class="fas fa-plus me-2"></i>إضافة مرحلة جديدة
                </button>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-layer-group"></i></div>
                <div class="empty-state-title">لا توجد مراحل دراسية</div>
                <div class="empty-state-message">ابدأ بإضافة مرحلة دراسية جديدة</div>
            </div>
        `;
        return;
    }
    
    levelsTab.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h4><i class="fas fa-layer-group me-2"></i>إدارة المراحل الدراسية</h4>
            <button class="btn btn-primary-modern btn-modern" onclick="showCreateLevelModal()">
                <i class="fas fa-plus me-2"></i>إضافة مرحلة جديدة
            </button>
        </div>
        
        <div class="levels-grid">
            ${levels.map((level, index) => `
                <div class="level-card" style="animation-delay: ${index * 0.1}s">
                    <div class="level-number">
                        ${level.order_number || index + 1}
                    </div>
                    <div class="level-name">${level.name}</div>
                    ${level.description ? `
                        <div class="level-subjects-count">
                            ${level.description}
                        </div>
                    ` : ''}
                    <div class="level-subjects-count">
                        <i class="fas fa-book me-1"></i>${level.subjects_count || 0} مادة
                    </div>
                    <div class="level-actions">
                        <button class="btn btn-card-view btn-card-action" onclick="viewLevelSubjects(${level.id})" title="عرض المواد">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-card-edit btn-card-action" onclick="editLevel(${level.id})" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-card-delete btn-card-action" onclick="deleteLevel(${level.id})" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderLevelsTable() {
    // This function is no longer used but kept for compatibility
    return '';
}

function showCreateLevelModal() {
    const modalHTML = `
        <div class="modal fade" id="createLevelModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">إضافة مرحلة دراسية جديدة</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="createLevelForm">
                            <div class="mb-3">
                                <label class="form-label">اسم المرحلة <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="levelName" required>
                                <small class="text-muted">مثال: المرحلة الأولى، المرحلة الثانية، إلخ</small>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">الوصف</label>
                                <textarea class="form-control" id="levelDescription" rows="2"></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">رقم الترتيب</label>
                                <input type="number" class="form-control" id="levelOrder" min="1">
                                <small class="text-muted">يستخدم لترتيب المراحل (اختياري)</small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="createLevel()">إضافة</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('createLevelModal'));
    modal.show();
    
    document.getElementById('createLevelModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

async function createLevel() {
    const name = document.getElementById('levelName').value.trim();
    const description = document.getElementById('levelDescription').value.trim();
    const order_number = document.getElementById('levelOrder').value;
    
    if (!name) {
        showNotification('اسم المرحلة مطلوب', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/levels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, description, order_number: order_number || null })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('تم إضافة المرحلة بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('createLevelModal')).hide();
            await loadLevels();
        } else {
            showNotification(data.message || 'فشل في إضافة المرحلة', 'error');
        }
    } catch (error) {
        console.error('Error creating level:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

async function editLevel(id) {
    const level = levels.find(l => l.id === id);
    if (!level) return;
    
    const modalHTML = `
        <div class="modal fade" id="editLevelModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">تعديل المرحلة الدراسية</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editLevelForm">
                            <div class="mb-3">
                                <label class="form-label">اسم المرحلة <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="editLevelName" value="${level.name}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">الوصف</label>
                                <textarea class="form-control" id="editLevelDescription" rows="2">${level.description || ''}</textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">رقم الترتيب</label>
                                <input type="number" class="form-control" id="editLevelOrder" value="${level.order_number || ''}" min="1">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="updateLevel(${id})">حفظ التعديلات</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('editLevelModal'));
    modal.show();
    
    document.getElementById('editLevelModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

async function updateLevel(id) {
    const name = document.getElementById('editLevelName').value.trim();
    const description = document.getElementById('editLevelDescription').value.trim();
    const order_number = document.getElementById('editLevelOrder').value;
    
    if (!name) {
        showNotification('اسم المرحلة مطلوب', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/levels/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, description, order_number: order_number || null })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('تم تحديث المرحلة بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editLevelModal')).hide();
            await loadLevels();
        } else {
            showNotification(data.message || 'فشل في تحديث المرحلة', 'error');
        }
    } catch (error) {
        console.error('Error updating level:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

async function deleteLevel(id) {
    const level = levels.find(l => l.id === id);
    if (!level) return;
    
    if (!confirm(`هل أنت متأكد من حذف المرحلة "${level.name}"؟\n\nتأكد من عدم وجود مواد مرتبطة بهذه المرحلة.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/levels/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('تم حذف المرحلة بنجاح', 'success');
            await loadLevels();
        } else {
            showNotification(data.message || 'فشل في حذف المرحلة', 'error');
        }
    } catch (error) {
        console.error('Error deleting level:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

async function viewLevelSubjects(levelId) {
    try {
        const response = await fetch(`/api/admin/levels/${levelId}/subjects`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            const level = levels.find(l => l.id === levelId);
            const modalHTML = `
                <div class="modal fade" id="levelSubjectsModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content modal-content-modern">
                            <div class="modal-header" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
                                <div class="d-flex align-items-center gap-3">
                                    <div style="width: 50px; height: 50px; border-radius: 15px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700;">
                                        ${level?.order_number || '#'}
                                    </div>
                                    <div>
                                        <h5 class="modal-title mb-0">مواد ${level?.name || 'المرحلة'}</h5>
                                        <small style="opacity: 0.9;">${data.subjects.length} مادة</small>
                                    </div>
                                </div>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" style="background: var(--card-bg); padding: 30px;">
                                ${data.subjects.length > 0 ? `
                                    <div class="subjects-grid">
                                        ${data.subjects.map((subject, index) => `
                                            <div class="subject-card-in-modal" style="animation-delay: ${index * 0.05}s">
                                                <div class="subject-card-header">
                                                    <div class="subject-card-icon">
                                                        <i class="fas fa-book"></i>
                                                    </div>
                                                    <div class="subject-card-title-area">
                                                        <div class="subject-card-name">${subject.name}</div>
                                                        ${subject.code ? `<div class="subject-card-code"><i class="fas fa-hashtag me-1"></i>${subject.code}</div>` : ''}
                                                    </div>
                                                </div>
                                                ${subject.description ? `
                                                <div class="subject-card-description">
                                                    <i class="fas fa-info-circle me-2"></i>${subject.description}
                                                </div>
                                                ` : ''}
                                                <div class="subject-card-footer">
                                                    <div class="subject-card-badge">
                                                        <i class="fas fa-check-circle me-1"></i>نشط
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                <div class="empty-state" style="padding: 60px 20px;">
                                    <div class="empty-state-icon"><i class="fas fa-books"></i></div>
                                    <div class="empty-state-title">لا توجد مواد</div>
                                    <div class="empty-state-message">لم يتم إضافة أي مواد لهذه المرحلة بعد</div>
                                </div>
                                `}
                            </div>
                            <div class="modal-footer" style="background: var(--card-bg); border-top: 1px solid var(--border-color);">
                                <button type="button" class="btn btn-secondary btn-modern" data-bs-dismiss="modal">
                                    <i class="fas fa-times me-2"></i>إغلاق
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = new bootstrap.Modal(document.getElementById('levelSubjectsModal'));
            modal.show();
            
            document.getElementById('levelSubjectsModal').addEventListener('hidden.bs.modal', function() {
                this.remove();
            });
        } else {
            showNotification('خطأ في تحميل مواد المرحلة', 'error');
        }
    } catch (error) {
        console.error('Error loading level subjects:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// Filter Doctor Statistics
function filterDoctorStats() {
    const searchValue = document.getElementById('searchDoctors').value.toLowerCase();
    const doctorItems = document.querySelectorAll('.doctor-stat-item');
    
    doctorItems.forEach(item => {
        const doctorName = item.getAttribute('data-doctor-name');
        const subjectName = item.getAttribute('data-subject');
        
        if (doctorName.includes(searchValue) || subjectName.includes(searchValue)) {
            item.style.display = '';
            item.style.animation = 'fadeIn 0.3s ease';
        } else {
            item.style.display = 'none';
        }
    });
    
    // Show "no results" message if all are hidden
    const visibleItems = Array.from(doctorItems).filter(item => item.style.display !== 'none');
    const grid = document.getElementById('doctorsStatsGrid');
    
    if (visibleItems.length === 0 && !document.getElementById('noDoctorResults')) {
        const noResultsMsg = `
            <div id="noDoctorResults" class="empty-state-modern">
                <div class="empty-icon"><i class="fas fa-search"></i></div>
                <h5>لا توجد نتائج</h5>
                <p class="text-muted">لم يتم العثور على نتائج تطابق بحثك</p>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', noResultsMsg);
    } else if (visibleItems.length > 0) {
        const noResultsElement = document.getElementById('noDoctorResults');
        if (noResultsElement) {
            noResultsElement.remove();
        }
    }
}

// Filter Subject Statistics
function filterSubjectStats() {
    const searchValue = document.getElementById('searchSubjects').value.toLowerCase();
    const subjectItems = document.querySelectorAll('.subject-stat-item');
    
    subjectItems.forEach(item => {
        const subjectName = item.getAttribute('data-subject-name');
        const doctorName = item.getAttribute('data-doctor');
        
        if (subjectName.includes(searchValue) || doctorName.includes(searchValue)) {
            item.style.display = '';
            item.style.animation = 'fadeIn 0.3s ease';
        } else {
            item.style.display = 'none';
        }
    });
    
    // Show "no results" message if all are hidden
    const visibleItems = Array.from(subjectItems).filter(item => item.style.display !== 'none');
    const grid = document.getElementById('subjectsStatsGrid');
    
    if (visibleItems.length === 0 && !document.getElementById('noSubjectResults')) {
        const noResultsMsg = `
            <div id="noSubjectResults" class="empty-state-modern">
                <div class="empty-icon"><i class="fas fa-search"></i></div>
                <h5>لا توجد نتائج</h5>
                <p class="text-muted">لم يتم العثور على نتائج تطابق بحثك</p>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', noResultsMsg);
    } else if (visibleItems.length > 0) {
        const noResultsElement = document.getElementById('noSubjectResults');
        if (noResultsElement) {
            noResultsElement.remove();
        }
    }
}

// Filter Attendance List
function filterAttendanceList() {
    const searchValue = document.getElementById('searchAttendance')?.value.toLowerCase() || '';
    const activeTab = document.querySelector('.tab-pane.active');
    
    if (!activeTab) return;
    
    const rows = activeTab.querySelectorAll('.attendance-row');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const studentName = row.getAttribute('data-student-name') || '';
        const studentId = row.getAttribute('data-student-id') || '';
        
        if (studentName.includes(searchValue) || studentId.includes(searchValue)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Update counts
    if (activeTab.id === 'successfulTab') {
        const countElement = document.getElementById('successCount');
        if (countElement) {
            countElement.textContent = visibleCount;
        }
    } else if (activeTab.id === 'failedTab') {
        const countElement = document.getElementById('failedCount');
        if (countElement) {
            countElement.textContent = visibleCount;
        }
    }
    
    // Show "no results" message
    const table = activeTab.querySelector('table');
    if (table && visibleCount === 0 && searchValue) {
        if (!activeTab.querySelector('.no-search-results')) {
            const noResultsMsg = `
                <div class="no-search-results alert alert-warning mt-3">
                    <i class="fas fa-search me-2"></i>
                    لم يتم العثور على نتائج تطابق بحثك
                </div>
            `;
            table.insertAdjacentHTML('afterend', noResultsMsg);
        }
    } else {
        const noResultsElement = activeTab.querySelector('.no-search-results');
        if (noResultsElement) {
            noResultsElement.remove();
        }
    }
}

// ==================== Students Management ====================

async function loadStudents() {
    const studentsTab = document.getElementById('studentsTab');
    if (!studentsTab) return;
    
    studentsTab.innerHTML = `
        <div class="row mb-4">
            <div class="col-12">
                <div class="stats-card">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h5 class="mb-0">
                            <i class="fas fa-users me-2"></i>
                            إدارة الطلاب
                        </h5>
                        <div class="input-group" style="max-width: 300px;">
                            <input type="text" class="form-control form-control-modern" 
                                   id="studentsSearch" placeholder="بحث عن طالب...">
                            <button class="btn btn-primary-modern" onclick="searchStudents()">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                    <div id="studentsList">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">جاري التحميل...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    await fetchStudents();
}

async function fetchStudents(search = '') {
    try {
        const response = await fetch(`/api/admin/students?search=${encodeURIComponent(search)}&limit=100`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load students');
        }
        
        const studentsList = document.getElementById('studentsList');
        if (!studentsList) return;
        
        if (!data.students || data.students.length === 0) {
            studentsList.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا يوجد طلاب مسجلين</p>
                </div>
            `;
            return;
        }
        
        studentsList.innerHTML = `
            <div class="table-responsive">
                <table class="table table-modern">
                    <thead>
                        <tr>
                            <th>الرقم الجامعي</th>
                            <th>الاسم</th>
                            <th>رقم الجروب</th>
                            <th>رقم السكشن</th>
                            <th>تاريخ الإنشاء</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.students.map(student => `
                            <tr>
                                <td>${student.student_id}</td>
                                <td>${student.student_name || 'غير محدد'}</td>
                                <td>${student.group_number || 'غير محدد'}</td>
                                <td>${student.section_number || 'غير محدد'}</td>
                                <td>${new Date(student.created_at).toLocaleDateString('ar-SA')}</td>
                                <td>
                                    <button class="btn btn-sm btn-info-modern me-2" onclick="editStudent('${student.student_id}')">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger-modern" onclick="deleteStudent('${student.student_id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${data.pagination.totalPages > 1 ? `
                <div class="d-flex justify-content-center mt-4">
                    <nav>
                        <ul class="pagination">
                            ${Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map(page => `
                                <li class="page-item ${page === data.pagination.page ? 'active' : ''}">
                                    <a class="page-link" href="#" onclick="loadStudentsPage(${page}); return false;">${page}</a>
                                </li>
                            `).join('')}
                        </ul>
                    </nav>
                </div>
            ` : ''}
        `;
    } catch (error) {
        console.error('Error fetching students:', error);
        const studentsList = document.getElementById('studentsList');
        if (studentsList) {
            studentsList.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    خطأ في تحميل قائمة الطلاب: ${error.message}
                </div>
            `;
        }
    }
}

function searchStudents() {
    const searchInput = document.getElementById('studentsSearch');
    if (searchInput) {
        fetchStudents(searchInput.value);
    }
}

async function editStudent(studentId) {
    try {
        const response = await fetch(`/api/admin/students/${studentId}`);
        const data = await response.json();
        
        if (!data.success || !data.student) {
            showNotification('فشل في تحميل بيانات الطالب', 'error');
            return;
        }
        
        const student = data.student;
        const modalHTML = `
            <div class="modal fade" id="editStudentModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-user-edit me-2"></i>تعديل بيانات الطالب
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editStudentForm">
                                <div class="mb-3">
                                    <label class="form-label fw-bold">الرقم الجامعي</label>
                                    <input type="text" class="form-control form-control-modern" 
                                           value="${student.student_id}" readonly>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-bold">الاسم رباعي <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-modern" 
                                           id="editStudentName" value="${student.student_name || ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-bold">رقم الجروب</label>
                                    <input type="text" class="form-control form-control-modern" 
                                           id="editStudentGroup" value="${student.group_number || ''}">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-bold">رقم السكشن</label>
                                    <input type="text" class="form-control form-control-modern" 
                                           id="editStudentSection" value="${student.section_number || ''}">
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                            <button type="button" class="btn btn-primary-modern btn-modern" 
                                    onclick="saveStudentChanges('${studentId}')">
                                <i class="fas fa-save me-2"></i>حفظ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('editStudentModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('editStudentModal'));
        modal.show();
        
        // Clean up on close
        document.getElementById('editStudentModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    } catch (error) {
        console.error('Error loading student:', error);
        showNotification('خطأ في تحميل بيانات الطالب', 'error');
    }
}

async function saveStudentChanges(studentId) {
    const name = document.getElementById('editStudentName').value.trim();
    const group = document.getElementById('editStudentGroup').value.trim();
    const section = document.getElementById('editStudentSection').value.trim();
    
    if (!name) {
        showNotification('الاسم الرباعي مطلوب', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/students/${studentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                student_name: name,
                group_number: group || null,
                section_number: section || null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('تم تحديث بيانات الطالب بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editStudentModal')).hide();
            await fetchStudents();
        } else {
            showNotification(data.message || 'فشل في تحديث البيانات', 'error');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

async function deleteStudent(studentId) {
    if (!confirm(`هل أنت متأكد من حذف الطالب برقم: ${studentId}؟`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/students/${studentId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('تم حذف الطالب بنجاح', 'success');
            await fetchStudents();
        } else {
            showNotification(data.message || 'فشل في حذف الطالب', 'error');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// ==================== Settings Management ====================

async function loadSettings() {
    const settingsTab = document.getElementById('settingsTab');
    if (!settingsTab) return;
    
    settingsTab.innerHTML = `
        <div class="row">
            <div class="col-12">
                <div class="stats-card">
                    <h5 class="mb-4">
                        <i class="fas fa-cog me-2"></i>
                        إعدادات النظام
                    </h5>
                    <div id="settingsList">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">جاري التحميل...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    await fetchSettings();
}

async function fetchSettings() {
    try {
        const response = await fetch('/api/admin/settings');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load settings');
        }
        
        const settingsList = document.getElementById('settingsList');
        if (!settingsList) return;
        
        const canEdit = data.canEdit !== false; // Default to true if not specified
        const isSuperAdmin = currentAdmin?.role === 'super_admin' || canEdit;
        
        const settingsHTML = data.settings.map(setting => {
            const isEnabled = setting.setting_value === '1';
            const settingLabels = {
                'student_data_entry_enabled': 'تفعيل إدخال بيانات الطلاب',
                'student_data_edit_enabled': 'تفعيل تعديل بيانات الطلاب'
            };
            
            return `
                <div class="card mb-3" style="border: 1px solid var(--border-color);">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${settingLabels[setting.setting_key] || setting.setting_key}</h6>
                                <p class="text-muted mb-0" style="font-size: 14px;">
                                    ${setting.description || ''}
                                </p>
                            </div>
                            <div class="d-flex align-items-center">
                                ${isSuperAdmin ? `
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" 
                                               id="setting_${setting.setting_key}" 
                                               ${isEnabled ? 'checked' : ''}
                                               onchange="toggleSetting('${setting.setting_key}', this.checked)">
                                        <label class="form-check-label" for="setting_${setting.setting_key}">
                                            ${isEnabled ? 'مفعل' : 'معطل'}
                                        </label>
                                    </div>
                                ` : `
                                    <span class="badge ${isEnabled ? 'bg-success' : 'bg-secondary'} me-2">
                                        ${isEnabled ? 'مفعل' : 'معطل'}
                                    </span>
                                    <small class="text-muted">
                                        <i class="fas fa-info-circle"></i>
                                        فقط المدير العام يمكنه التعديل
                                    </small>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        if (!isSuperAdmin && data.settings && data.settings.length > 0) {
            settingsList.innerHTML = `
                <div class="alert alert-info mb-3">
                    <i class="fas fa-info-circle me-2"></i>
                    يمكنك فقط عرض الإعدادات. فقط المدير العام (Super Admin) يمكنه تعديل الإعدادات.
                </div>
                ${settingsHTML}
            `;
        } else {
            settingsList.innerHTML = settingsHTML || '<p class="text-muted">لا توجد إعدادات</p>';
        }
    } catch (error) {
        console.error('Error fetching settings:', error);
        const settingsList = document.getElementById('settingsList');
        if (settingsList) {
            settingsList.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    خطأ في تحميل الإعدادات: ${error.message}
                </div>
            `;
        }
    }
}

async function toggleSetting(settingKey, enabled) {
    try {
        const response = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                setting_key: settingKey,
                setting_value: enabled
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('تم تحديث الإعداد بنجاح', 'success');
        } else {
            showNotification(data.message || 'فشل في تحديث الإعداد', 'error');
            // Revert checkbox
            const checkbox = document.getElementById(`setting_${settingKey}`);
            if (checkbox) {
                checkbox.checked = !enabled;
            }
        }
    } catch (error) {
        console.error('Error updating setting:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
        // Revert checkbox
        const checkbox = document.getElementById(`setting_${settingKey}`);
        if (checkbox) {
            checkbox.checked = !enabled;
        }
    }
}

// Make functions globally accessible
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.saveStudentChanges = saveStudentChanges;
window.searchStudents = searchStudents;
window.toggleSetting = toggleSetting;

// Ensure functions are globally accessible for HTML onclick handlers
window.handleLectureSubmit = handleLectureSubmit;
window.toggleGroupFields = toggleGroupFields;
window.filterDoctorStats = filterDoctorStats;
window.filterSubjectStats = filterSubjectStats;
window.filterAttendanceList = filterAttendanceList;
