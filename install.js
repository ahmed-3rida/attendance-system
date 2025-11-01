// Installation script for the Student Attendance System
const fs = require('fs');
const path = require('path');

console.log('🚀 Installing Student Attendance System...\n');

// Create necessary directories
const directories = ['exports', 'public'];
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    } else {
        console.log(`📁 Directory already exists: ${dir}`);
    }
});

console.log('\n📦 Installation completed!');
console.log('\nTo start the system:');
console.log('1. Run: npm install');
console.log('2. Run: npm start');
console.log('\nAccess points:');
console.log('- Student Interface: http://localhost:3000');
console.log('- Admin Panel: http://localhost:3000/admin');
console.log('\nDefault admin credentials:');
console.log('- Username: admin');
console.log('- Password: admin123');
