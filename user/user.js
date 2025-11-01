// User Interface JavaScript for Student Attendance
let currentLecture = null;
let qrCodeScanner = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('User interface DOM loaded, initializing...');
    try {
        initializeTheme();
        createParticles();
        initializeScanner();
        setupEventListeners();
        
        // Initialize profile functionality
        await loadSettings();
        
        // Check if student has account (saved data)
        await checkForAccount();
        
        // Check for student ID in URL params
        const urlParams = new URLSearchParams(window.location.search);
        const studentIdFromUrl = urlParams.get('student_id');
        
        if (studentIdFromUrl) {
            await checkStudentData(studentIdFromUrl);
        }
        
        // Watch for form input to check student data (both on blur and input)
        const studentIdInput = document.getElementById('studentId');
        if (studentIdInput) {
            // On blur (when user leaves the field)
            studentIdInput.addEventListener('blur', function() {
                const studentId = this.value.trim();
                if (studentId) {
                    checkStudentData(studentId);
                    autoFillForm();
                }
            });
            
            // Also check when user types (with debounce)
            let checkTimeout;
            studentIdInput.addEventListener('input', function() {
                clearTimeout(checkTimeout);
                checkTimeout = setTimeout(() => {
                    const studentId = this.value.trim();
                    if (studentId && studentId.length >= 3) {
                        checkStudentData(studentId);
                        autoFillForm();
                    }
                }, 500);
            });
        }
        
        console.log('User interface initialized successfully');
    } catch (error) {
        console.error('Error initializing user interface:', error);
    }
});

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    // Add transition effect
    document.body.style.transition = 'background 0.3s ease';
    
    // Show theme change animation
    showNotification(`تم التبديل إلى الوضع ${newTheme === 'dark' ? 'الليلي' : 'الصباحي'}`, 'success');
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// Floating Particles Effect
function createParticles() {
    // Particles are now handled by CSS background animation
    // This function is kept for backward compatibility
    console.log('Particles initialized (CSS-based)');
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add notification styles
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: var(--${type === 'success' ? 'success' : type === 'error' ? 'error' : 'warning'}-bg);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideInRight 0.5s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease-in forwards';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// Add notification animations to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Setup event listeners
function setupEventListeners() {
    document.getElementById('startScanner').addEventListener('click', startQRScanner);
    document.getElementById('stopScanner').addEventListener('click', stopQRScanner);
    document.getElementById('attendanceForm').addEventListener('submit', handleAttendanceSubmission);
    
    // Handle manual QR code input
    const manualQRInput = document.getElementById('manualQRCode');
    const manualQRButton = document.getElementById('manualQRButton');
    
    if (manualQRInput) {
        console.log('Adding keypress listener to manualQRCode input');
        manualQRInput.addEventListener('keypress', function(e) {
            console.log('Key pressed:', e.key);
            if (e.key === 'Enter') {
                console.log('Enter key pressed, calling processManualQR');
                e.preventDefault();
                processManualQR();
            }
        });
    } else {
        console.error('manualQRCode input element not found');
    }
    
    if (manualQRButton) {
        console.log('Adding click listener to manual QR button');
        manualQRButton.addEventListener('click', function(e) {
            console.log('Manual QR button clicked');
            e.preventDefault();
            processManualQR();
        });
    }
}

// Initialize QR code scanner
function initializeScanner() {
    // Check if HTML5-QRCode is available
    if (typeof Html5Qrcode !== 'undefined') {
        // Scanner will be initialized when start button is clicked
    } else {
        console.error('HTML5-QRCode library not loaded');
        showError('خطأ في تحميل مكتبة المسح');
    }
}

// Start QR code scanner
async function startQRScanner() {
    try {
        // Check for camera permission and availability
        const cameras = await Html5Qrcode.getCameras();
        
        if (cameras.length === 0) {
            showError('لم يتم العثور على كاميرا في الجهاز');
            return;
        }
        
        // Use the first available camera (usually the back camera)
        const cameraId = cameras[0].id;
        
        qrCodeScanner = new Html5Qrcode("qr-reader");
        
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        await qrCodeScanner.start(cameraId, config, (decodedText, decodedResult) => {
            console.log('QR Code detected:', decodedText);
            handleQRCodeDetected(decodedText);
        }, (errorMessage) => {
            // Handle scan errors silently to avoid console spam
        });
        
        // Update UI
        document.getElementById('startScanner').classList.add('hidden');
        document.getElementById('stopScanner').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error starting QR scanner:', error);
        showError('فشل في بدء المسح. تأكد من السماح للكاميرا بالعمل.');
    }
}

// Stop QR code scanner
function stopQRScanner() {
    if (qrCodeScanner) {
        qrCodeScanner.stop().then(() => {
            qrCodeScanner.clear();
            qrCodeScanner = null;
            
            // Update UI
            document.getElementById('startScanner').classList.remove('hidden');
            document.getElementById('stopScanner').classList.add('hidden');
        }).catch((error) => {
            console.error('Error stopping QR scanner:', error);
        });
    }
}

// Handle QR code detection
function handleQRCodeDetected(qrCode) {
    // Stop the scanner once QR code is detected
    stopQRScanner();
    
    // Process the QR code
    processQRCode(qrCode);
}

// Process manual QR code input
function processManualQR() {
    console.log('=== processManualQR called ===');
    const qrCodeInput = document.getElementById('manualQRCode');
    
    if (!qrCodeInput) {
        console.error('manualQRCode input not found');
        alert('خطأ: لم يتم العثور على حقل إدخال QR Code');
        return;
    }
    
    const qrCode = qrCodeInput.value.trim();
    console.log('QR Code entered:', qrCode);
    
    if (!qrCode) {
        console.log('No QR code entered, showing error');
        showError('يرجى إدخال QR Code');
        return;
    }
    
    console.log('Clearing input and calling processQRCode');
    qrCodeInput.value = '';
    processQRCode(qrCode);
}

// Process QR code and fetch lecture information
async function processQRCode(qrCode) {
    console.log('=== processQRCode called with:', qrCode, '===');
    
    // Show loading immediately
    try {
        showLoading();
    } catch (loadError) {
        console.error('Error showing loading:', loadError);
    }
    
    try {
        const url = `/api/lecture/qr/${qrCode}`;
        console.log('Fetching URL:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('Response received, status:', response.status);
        
        // Try to parse JSON response even for error status codes
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
            console.log('Parsed response data:', data);
        } catch (jsonError) {
            console.error('Error parsing JSON:', jsonError);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
        }
        
        if (data && data.success) {
            currentLecture = data.lecture;
            console.log('Lecture found:', currentLecture);
            showLectureInfo();
        } else if (data && data.message) {
            console.log('API returned error:', data.message);
            showError(data.message);
        } else {
            console.log('Unknown response format');
            showError('QR Code غير صحيح أو منتهي الصلاحية');
        }
    } catch (error) {
        console.error('Error processing QR code:', error);
        showError('خطأ في الاتصال بالخادم: ' + error.message);
    }
}

// Show lecture information
async function showLectureInfo() {
    if (!currentLecture) return;
    
    const lectureTypeText = currentLecture.lecture_type === 'lecture' ? 'محاضرة' : 'سكشن';
    
    const detailsHTML = `
        <div class="lecture-info-item">
            <span class="lecture-info-label">
                <i class="fas fa-book"></i>
                المادة
            </span>
            <span class="lecture-info-value">${currentLecture.subject_name}</span>
        </div>
        <div class="lecture-info-item">
            <span class="lecture-info-label">
                <i class="fas fa-chalkboard"></i>
                عنوان الجلسة
            </span>
            <span class="lecture-info-value">${currentLecture.title}</span>
        </div>
        <div class="lecture-info-item">
            <span class="lecture-info-label">
                <i class="fas fa-tag"></i>
                نوع الجلسة
            </span>
            <span class="lecture-info-value">${lectureTypeText}</span>
        </div>
        <div class="lecture-info-item">
            <span class="lecture-info-label">
                <i class="fas fa-calendar"></i>
                التاريخ
            </span>
            <span class="lecture-info-value">${new Date(currentLecture.date).toLocaleDateString('en-GB')}</span>
        </div>
        <div class="lecture-info-item">
            <span class="lecture-info-label">
                <i class="fas fa-clock"></i>
                الوقت
            </span>
            <span class="lecture-info-value">${currentLecture.start_time}${currentLecture.end_time ? ' - ' + currentLecture.end_time : ''}</span>
        </div>
    `;
    
    document.getElementById('lectureDetails').innerHTML = detailsHTML;
    
    // Load settings first if not loaded
    if (!settings) {
        await loadSettings();
    }
    
    // Check if data entry is enabled
    const entryEnabled = settings && settings.student_data_entry_enabled;
    
    // Check if student has saved data from localStorage or form
    let hasSavedData = false;
    let savedStudentId = localStorage.getItem('lastStudentId');
    
    // Check form first, then localStorage
    const studentIdInput = document.getElementById('studentId');
    if (studentIdInput && studentIdInput.value.trim()) {
        savedStudentId = studentIdInput.value.trim();
        localStorage.setItem('lastStudentId', savedStudentId);
    }
    
    // If we have a student ID, check for saved data
    if (savedStudentId) {
        // If form doesn't have the ID yet, set it
        if (studentIdInput && !studentIdInput.value.trim()) {
            studentIdInput.value = savedStudentId;
        }
        
        const student = await checkStudentData(savedStudentId);
        if (student) {
            hasSavedData = true;
            // Auto-fill form and make it read-only
            await setupFormWithSavedData(student);
        }
    }
    
    // If no saved data and entry is disabled, show error message
    if (!hasSavedData && !entryEnabled) {
        const formSection = document.querySelector('#lectureSection .student-card');
        if (formSection) {
            formSection.innerHTML = `
                <div class="student-card-header">
                    <div class="student-card-icon">
                        <i class="fas fa-ban"></i>
                    </div>
                    <div class="student-card-title">
                        <h3>إدخال البيانات معطل</h3>
                        <p>إدخال بيانات الطلاب غير مسموح حالياً من قبل الإدارة</p>
                    </div>
                </div>
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; color: var(--warning-color);"></i>
                    <p>لا يمكنك تسجيل الحضور لأنه لا توجد بيانات محفوظة لك وإدخال البيانات معطل من قبل الإدارة.</p>
                    <p style="margin-top: 12px; font-size: 14px;">يرجى التواصل مع الإدارة لتفعيل إدخال البيانات.</p>
                </div>
            `;
        }
    } else if (!hasSavedData && entryEnabled) {
        // If no saved data but entry is enabled, show the form normally for first-time entry
    // Update form validation
    updateFormValidation();
        // Show form normally and make sure fields are editable
        const formSection = document.querySelector('#lectureSection .student-card');
        if (formSection) {
            formSection.style.display = 'block';
        }
        
        // Make sure all fields are editable
        if (studentIdInput) studentIdInput.readOnly = false;
        const nameInput = document.getElementById('studentName');
        const groupInput = document.getElementById('groupNumber');
        const sectionInput = document.getElementById('sectionNumber');
        if (nameInput) nameInput.readOnly = false;
        if (groupInput) groupInput.readOnly = false;
        if (sectionInput) sectionInput.readOnly = false;
    } else if (!hasSavedData && !entryEnabled) {
        // If no saved data and entry is disabled, disable all input fields
        if (studentIdInput) studentIdInput.readOnly = true;
        const nameInput = document.getElementById('studentName');
        const groupInput = document.getElementById('groupNumber');
        const sectionInput = document.getElementById('sectionNumber');
        if (nameInput) nameInput.readOnly = true;
        if (groupInput) groupInput.readOnly = true;
        if (sectionInput) sectionInput.readOnly = true;
        
        // Disable submit button
        const submitButton = document.querySelector('#attendanceForm button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.style.opacity = '0.5';
            submitButton.style.cursor = 'not-allowed';
        }
    }
    
    // Show the lecture section with animation
    hideAllSections();
    const lectureSection = document.getElementById('lectureSection');
    lectureSection.classList.remove('hidden');
    
    showNotification('تم العثور على المحاضرة بنجاح!', 'success');
}

// Update form validation based on lecture type
function updateFormValidation() {
    const sectionNumberInput = document.getElementById('sectionNumber');
    
    if (currentLecture && currentLecture.lecture_type === 'section') {
        sectionNumberInput.required = true;
        sectionNumberInput.placeholder = 'مثال: S1, S2 (مطلوب للسكشن)';
    } else {
        sectionNumberInput.required = false;
        sectionNumberInput.placeholder = 'مثال: S1, S2 (مطلوب للسكشن فقط)';
    }
}

// Handle attendance form submission
async function handleAttendanceSubmission(e) {
    e.preventDefault();
    
    if (!currentLecture) {
        showError('لا توجد محاضرة محددة');
        return;
    }
    
    // Load settings if not loaded
    if (!settings) {
        await loadSettings();
    }
    
    const studentId = document.getElementById('studentId').value.trim();
    const studentName = document.getElementById('studentName').value.trim();
    const groupNumber = document.getElementById('groupNumber').value.trim();
    const sectionNumber = document.getElementById('sectionNumber').value.trim();
    
    // Check if we have saved data
    const hasSavedData = savedStudentData && savedStudentData.student_id === studentId;
    
    // If trying to enter new data but entry is disabled
    if (!hasSavedData && settings && !settings.student_data_entry_enabled) {
        showError('إدخال بيانات الطلاب غير مسموح حالياً من قبل الإدارة');
        return;
    }
    
    // If using saved data, use saved student data
    let finalStudentId = studentId;
    let finalStudentName = studentName;
    let finalGroupNumber = groupNumber;
    let finalSectionNumber = sectionNumber;
    
    if (hasSavedData) {
        finalStudentName = savedStudentData.student_name || studentName;
        finalGroupNumber = savedStudentData.group_number || groupNumber;
        finalSectionNumber = savedStudentData.section_number || sectionNumber;
    }
    
    if (!finalStudentId || !finalStudentName || !finalGroupNumber) {
        showError('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    // Check if section number is required
    if (currentLecture.lecture_type === 'section' && !finalSectionNumber) {
        showError('يرجى إدخال رقم السكشن');
        return;
    }
    
    try {
        const response = await fetch('/api/attendance/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lecture_id: currentLecture.id,
                student_id: finalStudentId,
                student_name: finalStudentName,
                group_number: finalGroupNumber,
                section_number: finalSectionNumber || null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Save student data after successful registration (if not already saved and entry is enabled)
            if ((!savedStudentData || savedStudentData.student_id !== finalStudentId) && 
                settings && settings.student_data_entry_enabled) {
                await saveStudentDataAfterRegistration(finalStudentId, finalStudentName, finalGroupNumber, finalSectionNumber);
                // Update localStorage and account flag
                localStorage.setItem('lastStudentId', finalStudentId);
                localStorage.setItem('accountCreated', 'true');
            } else if (savedStudentData && savedStudentData.student_id === finalStudentId) {
                // Just update localStorage if already saved
                localStorage.setItem('lastStudentId', finalStudentId);
                localStorage.setItem('accountCreated', 'true');
            }
            
            showSuccess(`تم تسجيل الحضور بنجاح!<br>مرحباً ${finalStudentName}`);
            
            // Clear the form
            document.getElementById('attendanceForm').reset();
            
            // Reset to initial state after a delay
            setTimeout(() => {
                resetToInitialState();
            }, 3000);
            
        } else {
            showError(data.message || 'فشل في تسجيل الحضور');
        }
    } catch (error) {
        console.error('Error submitting attendance:', error);
        showError('خطأ في الاتصال بالخادم');
    }
}

// Show loading state
function showLoading() {
    console.log('showLoading called');
    hideAllSections();
    showProgressiveLoading('جاري تحميل معلومات المحاضرة...');
    const loadingSection = document.getElementById('loadingSection');
    if (loadingSection) {
        loadingSection.classList.remove('hidden');
        console.log('Loading section shown');
    } else {
        console.error('loadingSection not found');
    }
}

// Show success message
function showSuccess(message) {
    hideAllSections();
    const messageSection = document.getElementById('messageSection');
    messageSection.innerHTML = `
        <div class="message-success">
            <div class="message-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h4 class="message-title">تم بنجاح!</h4>
            <p class="message-text">${message}</p>
            <button class="student-btn student-btn-primary" onclick="resetToInitialState()" style="margin-top: 24px;">
                <i class="fas fa-home"></i>
                <span>العودة للمسح</span>
            </button>
        </div>
    `;
    messageSection.classList.remove('hidden');
    showNotification('تم تسجيل الحضور بنجاح!', 'success');
    
    // Trigger celebration animations
    createConfetti();
    if (window.studentAnimations && window.studentAnimations.celebrateSuccess) {
        window.studentAnimations.celebrateSuccess();
    }
}

// Show error message
function showError(message) {
    console.log('showError called with message:', message);
    hideAllSections();
    const messageSection = document.getElementById('messageSection');
    if (messageSection) {
        messageSection.innerHTML = `
            <div class="message-error">
                <div class="message-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h4 class="message-title">خطأ!</h4>
                <p class="message-text">${message}</p>
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 24px;">
                    <button class="student-btn student-btn-primary" onclick="resetToInitialState()">
                        <i class="fas fa-redo"></i>
                        <span>العودة للمسح</span>
                    </button>
                    <button class="student-btn student-btn-warning" onclick="showInstructionsModal()">
                        <i class="fas fa-info-circle"></i>
                        <span>عرض التعليمات</span>
                    </button>
                </div>
            </div>
        `;
        messageSection.classList.remove('hidden');
        console.log('Error message shown');
        showNotification(message, 'error');
    } else {
        console.error('messageSection not found');
        showNotification(message, 'error');
    }
}

// Show instructions modal
function showInstructionsModal() {
    const modal = document.getElementById('instructionsModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        
        // Add shake animation to get attention
        const modalContent = modal.querySelector('.instructions-modal-content');
        if (modalContent) {
            modalContent.style.animation = 'none';
            setTimeout(() => {
                modalContent.style.animation = 'modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 10);
        }
        
        // Setup scroll indicator
        setupScrollIndicator();
    }
}

// Setup scroll indicator behavior
function setupScrollIndicator() {
    const modalBody = document.getElementById('instructionsBody');
    const scrollIndicator = document.getElementById('scrollIndicator');
    
    if (modalBody && scrollIndicator) {
        // Show indicator initially
        scrollIndicator.classList.remove('hidden');
        
        // Hide indicator when user scrolls down
        modalBody.addEventListener('scroll', function() {
            const scrollPosition = modalBody.scrollTop;
            const scrollHeight = modalBody.scrollHeight;
            const clientHeight = modalBody.clientHeight;
            
            // If scrolled more than 50px or reached bottom half, hide indicator
            if (scrollPosition > 50 || scrollPosition > (scrollHeight - clientHeight) / 3) {
                scrollIndicator.classList.add('hidden');
            } else {
                scrollIndicator.classList.remove('hidden');
            }
        });
        
        // Auto-hide after 5 seconds if user doesn't scroll
        setTimeout(() => {
            if (scrollIndicator && !scrollIndicator.classList.contains('hidden')) {
                scrollIndicator.style.transition = 'opacity 0.5s ease';
                scrollIndicator.style.opacity = '0';
                setTimeout(() => {
                    scrollIndicator.classList.add('hidden');
                    scrollIndicator.style.opacity = '1';
                }, 500);
            }
        }, 5000);
    }
}

// Close instructions modal
function closeInstructionsModal() {
    const modal = document.getElementById('instructionsModal');
    if (modal) {
        const modalContent = modal.querySelector('.instructions-modal-content');
        if (modalContent) {
            modalContent.style.animation = 'modalSlideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
            setTimeout(() => {
                modal.classList.add('hidden');
                document.body.style.overflow = ''; // Restore scrolling
                modalContent.style.animation = '';
            }, 300);
        } else {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
}

// Add modal close animation CSS
const modalCloseStyle = document.createElement('style');
modalCloseStyle.textContent = `
    @keyframes modalSlideDown {
        from {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        to {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
        }
    }
`;
document.head.appendChild(modalCloseStyle);

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeInstructionsModal();
    }
});

// Hide all sections
function hideAllSections() {
    console.log('hideAllSections called');
    const sections = [
        'loadingSection',
        'lectureSection',
        'messageSection'
    ];
    
    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.classList.add('hidden');
            console.log('Hidden section:', sectionId);
        } else {
            console.warn('Section not found:', sectionId);
        }
    });
}

// Reset to initial state
function resetToInitialState() {
    currentLecture = null;
    document.getElementById('scannerSection').classList.remove('hidden');
    document.getElementById('messageSection').classList.add('hidden');
    
    // Clear form
    const form = document.getElementById('attendanceForm');
    if (form) {
        form.reset();
        
        // Reset form fields to editable
        const studentIdInput = document.getElementById('studentId');
        const nameInput = document.getElementById('studentName');
        const groupInput = document.getElementById('groupNumber');
        const sectionInput = document.getElementById('sectionNumber');
        
        if (studentIdInput) studentIdInput.readOnly = false;
        if (nameInput) nameInput.readOnly = false;
        if (groupInput) groupInput.readOnly = false;
        if (sectionInput) sectionInput.readOnly = false;
        
        // Remove info message
        const infoMessage = form.querySelector('.saved-data-info');
        if (infoMessage) {
            infoMessage.remove();
        }
        
        // Reset form header
        const formSection = document.querySelector('#lectureSection .student-card');
        if (formSection) {
            const formHeader = formSection.querySelector('.student-card-title h3');
            if (formHeader) {
                formHeader.innerHTML = 'تسجيل الحضور';
            }
        }
    }
    
    // Clear lecture details
    document.getElementById('lectureDetails').innerHTML = '';
    
    // Stop scanner if running
    stopQRScanner();
}

// Handle page visibility change (to stop scanner when page is hidden)
document.addEventListener('visibilitychange', function() {
    if (document.hidden && qrCodeScanner) {
        stopQRScanner();
    }
});

// Handle page unload (cleanup)
window.addEventListener('beforeunload', function() {
    if (qrCodeScanner) {
        stopQRScanner();
    }
});

// Confetti Effect for Success
function createConfetti() {
    const colors = ['#667eea', '#764ba2', '#56ab2f', '#a8e6cf', '#ffd700', '#ff69b4'];
    const confettiCount = 50;
    const container = document.getElementById('confettiContainer') || document.body;
    
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
        
        container.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

// Add confetti animation to CSS
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
    @keyframes confettiFall {
        to {
            transform: translateY(100vh) rotate(${Math.random() * 360}deg);
            opacity: 0;
        }
    }
    
    .confetti-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9998;
    }
`;
document.head.appendChild(confettiStyle);

// Enhanced Input Animation
function addInputFocusEffects() {
    const inputs = document.querySelectorAll('.form-input-student, .form-control-modern');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('input-focused');
            
            // Add ripple effect
            const ripple = document.createElement('span');
            ripple.className = 'input-ripple';
            this.parentElement.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('input-focused');
        });
    });
}

// Call on form load and when lecture section is shown
setTimeout(addInputFocusEffects, 500);
// Re-apply when form is loaded dynamically
const formObserver = new MutationObserver(() => {
    addInputFocusEffects();
});
if (document.getElementById('lectureSection')) {
    formObserver.observe(document.getElementById('lectureSection'), { childList: true, subtree: true });
}

// Button Ripple Effect
function addButtonRipple(e) {
    const button = e.currentTarget;
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
        animation: ripple 0.6s ease-out;
        pointer-events: none;
    `;
    
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// Add ripple animation
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .btn-modern {
        position: relative;
        overflow: hidden;
    }
`;
document.head.appendChild(rippleStyle);

// Add ripple to all buttons
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.student-btn, .btn-modern');
    buttons.forEach(button => {
        button.addEventListener('click', addButtonRipple);
    });
});

// Progressive Loading Animation
function showProgressiveLoading(message = 'جاري التحميل...') {
    const loadingSection = document.getElementById('loadingSection');
    if (loadingSection) {
        loadingSection.innerHTML = `
            <div class="loading-wrapper">
                <div class="spinner-student"></div>
                <h5 class="loading-text">${message}</h5>
                <p class="loading-subtext">الرجاء الانتظار...</p>
            </div>
        `;
    }
}

// Smooth Scroll to Element
function smoothScrollTo(element) {
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
}

// Add some utility functions for better user experience
function formatTime(timeString) {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
}

function isValidStudentId(studentId) {
    // Basic validation - you can customize this based on your requirements
    const trimmedId = studentId.trim();
    return trimmedId.length >= 3 && trimmedId.length <= 20;
}

function isValidStudentName(name) {
    // Basic validation for Arabic names
    const trimmedName = name.trim();
    return trimmedName.length >= 5 && trimmedName.length <= 100;
}

// ==================== Profile Management Functions ====================

let savedStudentData = null;
let settings = null;

// Load settings on page load
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (data.success) {
            settings = data.settings;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Check if student has saved data
async function checkStudentData(studentId) {
    if (!studentId) {
        // Try to get from localStorage or form
        const studentIdInput = document.getElementById('studentId');
        if (studentIdInput && studentIdInput.value) {
            studentId = studentIdInput.value.trim();
        } else {
            return null;
        }
    }
    
    try {
        const response = await fetch(`/api/student/${studentId}`);
        const data = await response.json();
        console.log('checkStudentData response:', data);
        
        if (data.success && data.student) {
            savedStudentData = data.student;
            // Update localStorage and account flag when student data is found
            localStorage.setItem('lastStudentId', studentId);
            localStorage.setItem('accountCreated', 'true');
            // Show profile button if student has data
            const profileButton = document.getElementById('profileButton');
            if (profileButton) {
                profileButton.style.display = 'flex';
            }
            console.log('Student data loaded successfully:', data.student);
            return data.student;
        } else {
            console.log('Student not found in database');
        }
        return null;
    } catch (error) {
        console.error('Error checking student data:', error);
        return null;
    }
}

// Show profile modal
async function showProfileModal() {
    const modal = document.getElementById('profileModal');
    const modalBody = document.getElementById('profileModalBody');
    
    if (!modal || !modalBody) return;
    
    // Get student ID from form or localStorage
    let studentId = null;
    const studentIdInput = document.getElementById('studentId');
    if (studentIdInput && studentIdInput.value) {
        studentId = studentIdInput.value.trim();
    }
    
    if (!studentId && !savedStudentData) {
        modalBody.innerHTML = `
            <div class="profile-no-data">
                <i class="fas fa-user-circle"></i>
                <h4>لا توجد بيانات محفوظة</h4>
                <p>لم يتم العثور على بيانات محفوظة لك. قم بإدخال بياناتك عند تسجيل الحضور.</p>
            </div>
        `;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        return;
    }
    
    // Load student data if not already loaded
    if (!savedStudentData && studentId) {
        savedStudentData = await checkStudentData(studentId);
    }
    
    if (!savedStudentData) {
        modalBody.innerHTML = `
            <div class="profile-no-data">
                <i class="fas fa-user-circle"></i>
                <h4>لا توجد بيانات محفوظة</h4>
                <p>لم يتم العثور على بيانات محفوظة لك. قم بإدخال بياناتك عند تسجيل الحضور.</p>
            </div>
        `;
    } else {
        // Load settings to check if edit is enabled
        if (!settings) {
            await loadSettings();
        }
        
        const canEdit = settings && settings.student_data_edit_enabled;
        
        if (canEdit) {
            // Show edit form
            modalBody.innerHTML = `
                <div class="profile-info-item">
                    <div class="profile-info-label">
                        <i class="fas fa-id-card"></i>
                        <span>الرقم الجامعي</span>
                    </div>
                    <div class="profile-info-value">${savedStudentData.student_id}</div>
                </div>
                <form id="profileEditForm" class="profile-edit-form" onsubmit="saveProfileData(event)">
                    <div class="form-group-student">
                        <label class="form-label-student">
                            الاسم رباعي <span class="required">*</span>
                        </label>
                        <input type="text" class="form-input-student" id="profileStudentName" 
                               value="${savedStudentData.student_name || ''}" required>
                    </div>
                    <div class="form-group-student">
                        <label class="form-label-student">رقم الجروب</label>
                        <input type="text" class="form-input-student" id="profileGroupNumber" 
                               value="${savedStudentData.group_number || ''}">
                    </div>
                    <div class="form-group-student">
                        <label class="form-label-student">رقم السكشن</label>
                        <input type="text" class="form-input-student" id="profileSectionNumber" 
                               value="${savedStudentData.section_number || ''}">
                    </div>
                    <button type="submit" class="student-btn student-btn-primary profile-save-btn">
                        <i class="fas fa-save"></i>
                        <span>حفظ التعديلات</span>
                    </button>
                </form>
            `;
        } else {
            // Show view only
            modalBody.innerHTML = `
                <div class="profile-info-item">
                    <div class="profile-info-label">
                        <i class="fas fa-id-card"></i>
                        <span>الرقم الجامعي</span>
                    </div>
                    <div class="profile-info-value">${savedStudentData.student_id}</div>
                </div>
                <div class="profile-info-item">
                    <div class="profile-info-label">
                        <i class="fas fa-user"></i>
                        <span>الاسم رباعي</span>
                    </div>
                    <div class="profile-info-value">${savedStudentData.student_name || 'غير محدد'}</div>
                </div>
                <div class="profile-info-item">
                    <div class="profile-info-label">
                        <i class="fas fa-users"></i>
                        <span>رقم الجروب</span>
                    </div>
                    <div class="profile-info-value">${savedStudentData.group_number || 'غير محدد'}</div>
                </div>
                <div class="profile-info-item">
                    <div class="profile-info-label">
                        <i class="fas fa-layer-group"></i>
                        <span>رقم السكشن</span>
                    </div>
                    <div class="profile-info-value">${savedStudentData.section_number || 'غير محدد'}</div>
                </div>
                <div style="margin-top: 24px; padding: 16px; background: rgba(255, 193, 7, 0.1); border-radius: 12px; border-right: 3px solid #ffc107;">
                    <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
                        <i class="fas fa-info-circle" style="margin-left: 8px;"></i>
                        تعديل بياناتك غير مسموح حالياً من قبل الإدارة
                    </p>
                </div>
            `;
        }
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Close profile modal
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Save profile data
async function saveProfileData(event) {
    event.preventDefault();
    
    if (!savedStudentData) {
        showError('لا توجد بيانات محفوظة');
        return;
    }
    
    const studentName = document.getElementById('profileStudentName').value.trim();
    const groupNumber = document.getElementById('profileGroupNumber').value.trim();
    const sectionNumber = document.getElementById('profileSectionNumber').value.trim();
    
    if (!studentName) {
        showError('الاسم الرباعي مطلوب');
        return;
    }
    
    try {
        const response = await fetch('/api/student/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                student_id: savedStudentData.student_id,
                student_name: studentName,
                group_number: groupNumber || null,
                section_number: sectionNumber || null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update saved data
            savedStudentData = data.student;
            
            // Close the modal first
            closeProfileModal();
            
            // Show success notification after a short delay to ensure modal is closed
            setTimeout(() => {
                showNotification('تم حفظ البيانات بنجاح', 'success');
            }, 300);
        } else {
            showError(data.message || 'فشل في حفظ البيانات');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        showError('خطأ في الاتصال بالخادم');
    }
}

// Auto-fill form with saved data when student ID is entered
async function autoFillForm() {
    const studentIdInput = document.getElementById('studentId');
    if (!studentIdInput) return;
    
    const studentId = studentIdInput.value.trim();
    if (!studentId) return;
    
    // Save to localStorage
    localStorage.setItem('lastStudentId', studentId);
    
    const student = await checkStudentData(studentId);
    if (student) {
        // If lecture section is visible, use setupFormWithSavedData
        const lectureSection = document.getElementById('lectureSection');
        if (lectureSection && !lectureSection.classList.contains('hidden')) {
            await setupFormWithSavedData(student);
        } else {
            // Otherwise just fill the fields
            const nameInput = document.getElementById('studentName');
            const groupInput = document.getElementById('groupNumber');
            const sectionInput = document.getElementById('sectionNumber');
            
            if (nameInput) {
                nameInput.value = student.student_name || '';
            }
            if (groupInput) {
                groupInput.value = student.group_number || '';
            }
            if (sectionInput) {
                sectionInput.value = student.section_number || '';
            }
        }
        
        // Show profile button
        const profileButton = document.getElementById('profileButton');
        if (profileButton) {
            profileButton.style.display = 'flex';
        }
        
        showNotification('تم تحميل بياناتك المحفوظة', 'success');
    }
}

// Setup form with saved data (make fields read-only and auto-fill)
async function setupFormWithSavedData(student) {
    const studentIdInput = document.getElementById('studentId');
    const nameInput = document.getElementById('studentName');
    const groupInput = document.getElementById('groupNumber');
    const sectionInput = document.getElementById('sectionNumber');
    const formSection = document.querySelector('#lectureSection .student-card');
    
    if (!studentIdInput || !nameInput) return;
    
    // Load settings if not loaded
    if (!settings) {
        await loadSettings();
    }
    
    // Auto-fill form fields
    studentIdInput.value = student.student_id || '';
    nameInput.value = student.student_name || '';
    if (groupInput) {
        groupInput.value = student.group_number || '';
    }
    if (sectionInput) {
        sectionInput.value = student.section_number || '';
    }
    
    // Check if edit is enabled
    const editEnabled = settings && settings.student_data_edit_enabled;
    
    // Make fields read-only since data is already saved (unless edit is enabled)
    studentIdInput.readOnly = true; // ID is always read-only
    if (!editEnabled) {
        nameInput.readOnly = true;
        if (groupInput) groupInput.readOnly = true;
        if (sectionInput) sectionInput.readOnly = true;
    }
    
    // Update form styling to show it's using saved data
    if (formSection) {
        const formHeader = formSection.querySelector('.student-card-title h3');
        if (formHeader) {
            formHeader.innerHTML = '<i class="fas fa-check-circle me-2" style="color: var(--success-color);"></i>تسجيل الحضور (بياناتك محفوظة)';
        }
        
        // Add info message
        let infoMessage = formSection.querySelector('.saved-data-info');
        if (!infoMessage) {
            infoMessage = document.createElement('div');
            infoMessage.className = 'saved-data-info';
            infoMessage.style.cssText = 'padding: 12px 16px; background: rgba(39, 174, 96, 0.1); border-radius: 8px; margin-bottom: 20px; border-right: 3px solid var(--success-color);';
            infoMessage.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; color: var(--text-primary);">
                    <i class="fas fa-info-circle" style="color: var(--success-color);"></i>
                    <span style="font-size: 14px;">بياناتك محفوظة من الاستخدام السابق. يمكنك تسجيل الحضور مباشرة أو <a href="#" onclick="showProfileModal(); return false;" style="color: var(--primary-color); text-decoration: underline;">تعديل بياناتك</a>.</span>
                </div>
            `;
            const form = document.getElementById('attendanceForm');
            if (form) {
                form.insertBefore(infoMessage, form.firstChild);
            }
        }
    }
    
    // Show profile button
    const profileButton = document.getElementById('profileButton');
    if (profileButton) {
        profileButton.style.display = 'flex';
    }
}

// Check if student has account (saved data)
async function checkForAccount() {
    console.log('Checking for account...');
    
    // First check if account was created flag exists
    const accountCreated = localStorage.getItem('accountCreated');
    const savedStudentId = localStorage.getItem('lastStudentId');
    
    if (accountCreated === 'true' && savedStudentId) {
        console.log('Found account flag and student ID:', savedStudentId);
        const student = await checkStudentData(savedStudentId);
        if (student) {
            console.log('Student data found, enabling scanner');
            // Student has account, enable scanner
            enableScanner();
            return true;
        } else {
            console.log('Student ID in localStorage but no data in database, clearing...');
            // ID exists in localStorage but no data found in database, clear it
            localStorage.removeItem('lastStudentId');
            localStorage.removeItem('accountCreated');
        }
    }
    
    // Check if there's any saved student data in the global variable
    if (savedStudentData && savedStudentData.student_id) {
        console.log('Found saved student data in memory:', savedStudentData.student_id);
        localStorage.setItem('lastStudentId', savedStudentData.student_id);
        localStorage.setItem('accountCreated', 'true');
        enableScanner();
        return true;
    }
    
    // If no account found, check localStorage for student ID and verify in database
    if (savedStudentId && !accountCreated) {
        console.log('Found student ID in localStorage, verifying in database:', savedStudentId);
        const student = await checkStudentData(savedStudentId);
        if (student) {
            console.log('Verified student in database, enabling scanner');
            localStorage.setItem('accountCreated', 'true');
            enableScanner();
            return true;
        } else {
            console.log('Student ID not found in database, clearing localStorage');
            localStorage.removeItem('lastStudentId');
        }
    }
    
    // Check settings before showing account creation modal
    if (!settings) {
        await loadSettings();
    }
    
    const entryEnabled = settings && settings.student_data_entry_enabled;
    
    if (!entryEnabled) {
        console.log('Data entry is disabled, showing disabled message instead of creation modal');
        // Entry is disabled, show disabled message but don't show account creation
        showEntryDisabledMessage();
        return false;
    }
    
    console.log('No account found, showing creation modal');
    // No account found anywhere, show account creation modal (only if entry is enabled)
    showAccountCreationModal();
    return false;
}

// Show account creation modal
function showAccountCreationModal() {
    const modal = document.getElementById('accountCreationModal');
    if (modal) {
        // Double check that account doesn't exist before showing
        const accountCreated = localStorage.getItem('accountCreated');
        const savedStudentId = localStorage.getItem('lastStudentId');
        
        if (accountCreated === 'true' && savedStudentId) {
            // Account exists, don't show modal
            console.log('Account exists, not showing creation modal');
            return;
        }
        
        // Double check settings
        if (!settings || !settings.student_data_entry_enabled) {
            console.log('Data entry is disabled, not showing creation modal');
            showEntryDisabledMessage();
            return;
        }
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        // Disable scanner
        disableScanner();
    }
}

// Show message when entry is disabled
function showEntryDisabledMessage() {
    const scannerSection = document.getElementById('scannerSection');
    if (scannerSection) {
        const disabledMessage = scannerSection.querySelector('.entry-disabled-message');
        if (!disabledMessage) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'entry-disabled-message';
            messageDiv.style.cssText = `
                padding: 24px;
                background: rgba(255, 193, 7, 0.1);
                border-radius: 12px;
                margin-top: 20px;
                border-right: 3px solid #ffc107;
                text-align: center;
            `;
            messageDiv.innerHTML = `
                <i class="fas fa-ban" style="font-size: 48px; color: var(--warning-color); margin-bottom: 16px;"></i>
                <h4 style="color: var(--text-primary); margin-bottom: 12px;">إدخال البيانات معطل</h4>
                <p style="color: var(--text-secondary); margin-bottom: 8px;">
                    إدخال بيانات الطلاب غير مسموح حالياً من قبل الإدارة
                </p>
                <p style="color: var(--text-secondary); font-size: 14px;">
                    يرجى التواصل مع الإدارة لتفعيل إدخال البيانات أو استخدام حساب موجود
                </p>
            `;
            scannerSection.appendChild(messageDiv);
        }
    }
    disableScanner();
}

// Close account creation modal
function closeAccountCreationModal() {
    const modal = document.getElementById('accountCreationModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Create account (first time registration)
async function createAccount(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('accountStudentId').value.trim();
    const studentName = document.getElementById('accountStudentName').value.trim();
    const groupNumber = document.getElementById('accountGroupNumber').value.trim();
    const sectionNumber = document.getElementById('accountSectionNumber').value.trim();
    
    if (!studentId || !studentName) {
        showError('الرجاء إدخال الرقم الجامعي والاسم الرباعي');
        return;
    }
    
    // Check if entry is enabled
    if (!settings) {
        await loadSettings();
    }
    
    const entryEnabled = settings && settings.student_data_entry_enabled;
    
    if (!entryEnabled) {
        showError('إدخال بيانات الطلاب غير مسموح حالياً من قبل الإدارة');
        return;
    }
    
    try {
        const response = await fetch('/api/student/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                student_id: studentId,
                student_name: studentName,
                group_number: groupNumber || null,
                section_number: sectionNumber || null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Save student data
            savedStudentData = data.student;
            localStorage.setItem('lastStudentId', studentId);
            // Also save a flag that account is created
            localStorage.setItem('accountCreated', 'true');
            
            // Close modal
            closeAccountCreationModal();
            
            // Enable scanner
            enableScanner();
            
            // Show profile button
            const profileButton = document.getElementById('profileButton');
            if (profileButton) {
                profileButton.style.display = 'flex';
            }
            
            // Show success notification
            setTimeout(() => {
                showNotification('تم إنشاء حسابك بنجاح! يمكنك الآن مسح QR Code', 'success');
            }, 300);
        } else {
            // If account already exists, treat it as success
            if (data.message && data.message.includes('مسجل بالفعل')) {
                // Account already exists, load it
                const student = await checkStudentData(studentId);
                if (student) {
                    savedStudentData = student;
                    localStorage.setItem('lastStudentId', studentId);
                    localStorage.setItem('accountCreated', 'true');
                    
                    closeAccountCreationModal();
                    enableScanner();
                    
                    const profileButton = document.getElementById('profileButton');
                    if (profileButton) {
                        profileButton.style.display = 'flex';
                    }
                    
                    setTimeout(() => {
                        showNotification('مرحباً بك مرة أخرى!', 'success');
                    }, 300);
                    return;
                }
            }
            showError(data.message || 'فشل في إنشاء الحساب');
        }
    } catch (error) {
        console.error('Error creating account:', error);
        showError('خطأ في الاتصال بالخادم');
    }
}

// Enable scanner (when account exists)
function enableScanner() {
    const startButton = document.getElementById('startScanner');
    const stopButton = document.getElementById('stopScanner');
    const manualQRInput = document.getElementById('manualQRCode');
    const manualQRButton = document.getElementById('manualQRButton');
    const accountMessage = document.getElementById('accountRequiredMessage');
    
    if (startButton) {
        startButton.disabled = false;
        startButton.style.opacity = '1';
        startButton.style.cursor = 'pointer';
    }
    if (manualQRInput) {
        manualQRInput.disabled = false;
    }
    if (manualQRButton) {
        manualQRButton.disabled = false;
    }
    if (accountMessage) {
        accountMessage.style.display = 'none';
    }
}

// Disable scanner (when no account)
function disableScanner() {
    const startButton = document.getElementById('startScanner');
    const stopButton = document.getElementById('stopScanner');
    const manualQRInput = document.getElementById('manualQRCode');
    const manualQRButton = document.getElementById('manualQRButton');
    const accountMessage = document.getElementById('accountRequiredMessage');
    
    if (startButton) {
        startButton.disabled = true;
        startButton.style.opacity = '0.5';
        startButton.style.cursor = 'not-allowed';
    }
    if (stopButton) {
        stopButton.classList.add('hidden');
    }
    if (manualQRInput) {
        manualQRInput.disabled = true;
    }
    if (manualQRButton) {
        manualQRButton.disabled = true;
    }
    if (accountMessage) {
        accountMessage.style.display = 'block';
    }
}

// Make createAccount globally accessible
window.createAccount = createAccount;

// Save student data after successful registration
async function saveStudentDataAfterRegistration(studentId, studentName, groupNumber, sectionNumber) {
    try {
        // First check if entry is enabled
        if (!settings) {
            await loadSettings();
        }
        
        const entryEnabled = settings && settings.student_data_entry_enabled;
        
        if (entryEnabled) {
            const response = await fetch('/api/student/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    student_id: studentId,
                    student_name: studentName,
                    group_number: groupNumber || null,
                    section_number: sectionNumber || null
                })
            });
            
            const data = await response.json();
            if (data.success) {
                // Update saved data
                savedStudentData = data.student;
                // Update localStorage and account flag
                if (savedStudentData && savedStudentData.student_id) {
                    localStorage.setItem('lastStudentId', savedStudentData.student_id);
                    localStorage.setItem('accountCreated', 'true');
                }
                // Show profile button
                const profileButton = document.getElementById('profileButton');
                if (profileButton) {
                    profileButton.style.display = 'flex';
                }
            }
        }
    } catch (error) {
        console.error('Error saving student data:', error);
        // Don't show error to user, it's not critical
    }
}

