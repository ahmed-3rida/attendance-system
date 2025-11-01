const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const QRCode = require('qrcode');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'attendance-system-secret-key',
    resave: true,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    }
}));

// Initialize SQLite Database
const db = new sqlite3.Database('attendance.db');

// Create tables
db.serialize(() => {
    // Admin users table
    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT,
        email TEXT,
        role TEXT DEFAULT 'doctor',
        assigned_subject_id INTEGER,
        is_active BOOLEAN DEFAULT 1,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(assigned_subject_id) REFERENCES subjects(id),
        FOREIGN KEY(created_by) REFERENCES admins(id)
    )`);
    
    // Add missing columns if they don't exist (ignore errors if column already exists)
    db.run(`ALTER TABLE admins ADD COLUMN full_name TEXT`, () => {});
    db.run(`ALTER TABLE admins ADD COLUMN email TEXT`, () => {});
    db.run(`ALTER TABLE admins ADD COLUMN role TEXT DEFAULT 'doctor'`, () => {});
    db.run(`ALTER TABLE admins ADD COLUMN assigned_subject_id INTEGER`, () => {});
    db.run(`ALTER TABLE admins ADD COLUMN is_active BOOLEAN DEFAULT 1`, () => {});
    db.run(`ALTER TABLE admins ADD COLUMN created_by INTEGER`, () => {});
    
    // Add missing columns to subjects table
    db.run(`ALTER TABLE subjects ADD COLUMN code TEXT`, () => {});
    db.run(`ALTER TABLE subjects ADD COLUMN description TEXT`, () => {});
    db.run(`ALTER TABLE subjects ADD COLUMN admin_id INTEGER`, () => {});
    db.run(`ALTER TABLE subjects ADD COLUMN is_active BOOLEAN DEFAULT 1`, () => {});
    db.run(`ALTER TABLE subjects ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});
    
    // Add missing columns to lectures table
    db.run(`ALTER TABLE lectures ADD COLUMN lecture_type TEXT DEFAULT 'lecture'`, () => {}); // 'lecture' or 'section'
    db.run(`ALTER TABLE lectures ADD COLUMN group_number TEXT`, () => {});
    db.run(`ALTER TABLE lectures ADD COLUMN section_number TEXT`, () => {});
    db.run(`ALTER TABLE lectures ADD COLUMN qr_disabled BOOLEAN DEFAULT 0`, () => {});
    db.run(`ALTER TABLE lectures ADD COLUMN attendance_finished BOOLEAN DEFAULT 0`, () => {});
    db.run(`ALTER TABLE lectures ADD COLUMN lecture_finished BOOLEAN DEFAULT 0`, () => {});
    db.run(`ALTER TABLE lectures ADD COLUMN created_by INTEGER`, () => {
        console.log('Added created_by column to lectures table');
    });
    
    // Add missing columns to attendance table
    db.run(`ALTER TABLE attendance ADD COLUMN group_number TEXT`, () => {});
    db.run(`ALTER TABLE attendance ADD COLUMN section_number TEXT`, () => {});

    // Levels table (المراحل الدراسية)
    db.run(`CREATE TABLE IF NOT EXISTS levels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        order_number INTEGER,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Subjects table
    db.run(`CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE,
        description TEXT,
        level_id INTEGER,
        admin_id INTEGER,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(level_id) REFERENCES levels(id),
        FOREIGN KEY(admin_id) REFERENCES admins(id)
    )`);
    
    // Add level_id column to subjects table if it doesn't exist
    db.run(`ALTER TABLE subjects ADD COLUMN level_id INTEGER`, () => {});

    // Lectures table
    db.run(`CREATE TABLE IF NOT EXISTS lectures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER,
        title TEXT NOT NULL,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME,
        qr_code TEXT UNIQUE NOT NULL,
        lecture_type TEXT DEFAULT 'lecture',
        group_number TEXT,
        section_number TEXT,
        is_active BOOLEAN DEFAULT 1,
        qr_disabled BOOLEAN DEFAULT 0,
        attendance_finished BOOLEAN DEFAULT 0,
        lecture_finished BOOLEAN DEFAULT 0,
        created_by INTEGER,
        qr_refresh_interval INTEGER,
        qr_code_expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(subject_id) REFERENCES subjects(id),
        FOREIGN KEY(created_by) REFERENCES admins(id)
    )`);

    // Attendance table
    db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lecture_id INTEGER,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        group_number TEXT,
        section_number TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id TEXT,
        FOREIGN KEY(lecture_id) REFERENCES lectures(id),
        UNIQUE(lecture_id, student_id)
    )`);

    // Failed attempts table
    db.run(`CREATE TABLE IF NOT EXISTS failed_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lecture_id INTEGER,
        student_id TEXT,
        reason TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(lecture_id) REFERENCES lectures(id)
    )`);

    // Doctor subjects relationship table (many-to-many)
    db.run(`CREATE TABLE IF NOT EXISTS doctor_subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id INTEGER,
        subject_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(doctor_id) REFERENCES admins(id),
        FOREIGN KEY(subject_id) REFERENCES subjects(id),
        UNIQUE(doctor_id, subject_id)
    )`);
    
    // Students table (to store student profile data)
    db.run(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        student_name TEXT NOT NULL,
        group_number TEXT,
        section_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Settings table (to store system settings)
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL DEFAULT '0',
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Migration: Move existing assigned_subject_id to doctor_subjects table
    db.all('SELECT id, assigned_subject_id, username FROM admins WHERE role = "doctor" AND assigned_subject_id IS NOT NULL', (err, doctors) => {
        if (!err && doctors) {
            console.log(`Found ${doctors.length} doctors with assigned_subject_id to migrate`);
            doctors.forEach(doctor => {
                db.run('INSERT OR IGNORE INTO doctor_subjects (doctor_id, subject_id) VALUES (?, ?)', 
                       [doctor.id, doctor.assigned_subject_id], function(err) {
                    if (err) {
                        console.error(`Migration error for doctor ${doctor.username} (ID: ${doctor.id}):`, err);
                    } else {
                        console.log(`Migrated subject ${doctor.assigned_subject_id} for doctor ${doctor.username} (ID: ${doctor.id})`);
                    }
                });
            });
        } else if (err) {
            console.error('Error during migration:', err);
        } else {
            console.log('No doctors found with assigned_subject_id for migration');
        }
    });
    
    // Migration: Add student_name column to failed_attempts table if it doesn't exist
    db.run('ALTER TABLE failed_attempts ADD COLUMN student_name TEXT', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding student_name to failed_attempts:', err);
        } else if (!err) {
            console.log('Added student_name column to failed_attempts table');
        } else {
            console.log('student_name column already exists in failed_attempts table');
        }
    });
    
    // Migration: Add group_number column to failed_attempts table if it doesn't exist
    db.run('ALTER TABLE failed_attempts ADD COLUMN group_number TEXT', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding group_number to failed_attempts:', err);
        } else if (!err) {
            console.log('Added group_number column to failed_attempts table');
        } else {
            console.log('group_number column already exists in failed_attempts table');
        }
    });
    
    // Migration: Add section_number column to failed_attempts table if it doesn't exist
    db.run('ALTER TABLE failed_attempts ADD COLUMN section_number TEXT', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding section_number to failed_attempts:', err);
        } else if (!err) {
            console.log('Added section_number column to failed_attempts table');
        } else {
            console.log('section_number column already exists in failed_attempts table');
        }
    });
    
    // Migration: Update old lectures without created_by
    // Assign them to the doctor who has access to that subject
    db.all(`SELECT l.id as lecture_id, l.subject_id 
            FROM lectures l 
            WHERE l.created_by IS NULL`, (err, lectures) => {
        if (!err && lectures && lectures.length > 0) {
            console.log(`Found ${lectures.length} lectures without created_by, assigning to doctors...`);
            
            lectures.forEach(lecture => {
                // Find a doctor who has access to this subject
                db.get(`SELECT doctor_id FROM doctor_subjects WHERE subject_id = ? LIMIT 1`, 
                       [lecture.subject_id], (err, result) => {
                    if (!err && result) {
                        db.run(`UPDATE lectures SET created_by = ? WHERE id = ?`, 
                               [result.doctor_id, lecture.lecture_id], (err) => {
                            if (err) {
                                console.error(`Error updating lecture ${lecture.lecture_id}:`, err);
                            } else {
                                console.log(`Assigned lecture ${lecture.lecture_id} to doctor ${result.doctor_id}`);
                            }
                        });
                    } else {
                        // Fallback: try to find by assigned_subject_id
                        db.get(`SELECT id FROM admins WHERE assigned_subject_id = ? AND role = 'doctor' LIMIT 1`, 
                               [lecture.subject_id], (err, admin) => {
                            if (!err && admin) {
                                db.run(`UPDATE lectures SET created_by = ? WHERE id = ?`, 
                                       [admin.id, lecture.lecture_id], (err) => {
                                    if (err) {
                                        console.error(`Error updating lecture ${lecture.lecture_id}:`, err);
                                    } else {
                                        console.log(`Assigned lecture ${lecture.lecture_id} to doctor ${admin.id} (fallback)`);
                                    }
                                });
                            }
                        });
                    }
                });
            });
        } else if (!err) {
            console.log('No lectures found without created_by');
        }
    });
});

// Add default levels if not exist
db.get("SELECT COUNT(*) as count FROM levels", (err, result) => {
    if (!err && result.count === 0) {
        const defaultLevels = [
            { name: 'المرحلة الأولى', description: 'السنة الدراسية الأولى', order: 1 },
            { name: 'المرحلة الثانية', description: 'السنة الدراسية الثانية', order: 2 },
            { name: 'المرحلة الثالثة', description: 'السنة الدراسية الثالثة', order: 3 },
            { name: 'المرحلة الرابعة', description: 'السنة الدراسية الرابعة', order: 4 }
        ];
        
        defaultLevels.forEach(level => {
            db.run("INSERT INTO levels (name, description, order_number) VALUES (?, ?, ?)",
                   [level.name, level.description, level.order], (err) => {
                if (err) {
                    console.error('Error creating default level:', err);
                } else {
                    console.log(`✅ Created default level: ${level.name}`);
                }
            });
        });
    }
});

// Default super admin user (username: admin, password: admin123)
const bcrypt = require('bcryptjs');
db.get("SELECT * FROM admins WHERE username = 'admin'", (err, row) => {
    if (err) {
        console.error('Error checking admin user:', err);
        return;
    }
    
    if (!row) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run("INSERT INTO admins (username, password, full_name, role) VALUES (?, ?, ?, ?)", 
               ['admin', hashedPassword, 'Super Administrator', 'super_admin'], function(err) {
            if (err) {
                console.error('Error creating admin user:', err);
            } else {
                console.log('✅ Admin user created with super_admin role');
            }
        });
    } else {
        console.log('🔍 Existing admin user:', { username: row.username, role: row.role });
        // Update existing admin to ensure it has the correct role
        if (!row.role || row.role !== 'super_admin') {
            db.run("UPDATE admins SET role = ?, full_name = ? WHERE username = 'admin'", 
                   ['super_admin', row.full_name || 'Super Administrator'], function(err) {
                if (err) {
                    console.error('Error updating admin role:', err);
                } else {
                    console.log('✅ Admin user role updated to super_admin');
                }
            });
        } else {
            console.log('✅ Admin user already has correct role');
        }
    }
});

// Add default settings if they don't exist
db.get("SELECT COUNT(*) as count FROM settings", (err, result) => {
    if (!err && result.count === 0) {
        const defaultSettings = [
            { 
                setting_key: 'student_data_entry_enabled', 
                setting_value: '1', 
                description: 'تفعيل إدخال بيانات الطلاب (يسمح للطلاب بإنشاء حساب وإدخال بياناتهم)' 
            },
            { 
                setting_key: 'student_data_edit_enabled', 
                setting_value: '1', 
                description: 'تفعيل تعديل بيانات الطلاب (يسمح للطلاب بتعديل بياناتهم المحفوظة)' 
            }
        ];
        
        defaultSettings.forEach(setting => {
            db.run("INSERT INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)",
                   [setting.setting_key, setting.setting_value, setting.description], (err) => {
                if (err) {
                    console.error('Error creating default setting:', err);
                } else {
                    console.log(`✅ Created default setting: ${setting.setting_key}`);
                }
            });
        });
    } else if (!err && result.count > 0) {
        // Ensure all required settings exist
        db.get("SELECT * FROM settings WHERE setting_key = 'student_data_entry_enabled'", (err, row) => {
            if (!err && !row) {
                db.run("INSERT INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)",
                       ['student_data_entry_enabled', '1', 'تفعيل إدخال بيانات الطلاب'], (err) => {
                    if (err) {
                        console.error('Error creating student_data_entry_enabled setting:', err);
                    } else {
                        console.log('✅ Created student_data_entry_enabled setting');
                    }
                });
            }
        });
        
        db.get("SELECT * FROM settings WHERE setting_key = 'student_data_edit_enabled'", (err, row) => {
            if (!err && !row) {
                db.run("INSERT INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)",
                       ['student_data_edit_enabled', '1', 'تفعيل تعديل بيانات الطلاب'], (err) => {
                    if (err) {
                        console.error('Error creating student_data_edit_enabled setting:', err);
                    } else {
                        console.log('✅ Created student_data_edit_enabled setting');
                    }
                });
            }
        });
    }
});

// Serve admin static files (JS, CSS, etc.)
app.use('/admin', express.static('admin', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Serve admin panel HTML (after static files)
app.get('/admin', (req, res) => {
    console.log('Admin route accessed:', req.path);
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('/admin/*', (req, res) => {
    console.log('Admin wildcard route accessed:', req.path);
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Serve user static files (JS, CSS, etc.) - before public static
app.use('/', express.static('user', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    },
    index: false // Don't serve index.html as static file
}));

// Static files middleware for public folder
app.use(express.static('public'));

// Middleware for role-based access control
function requireRole(roles) {
    return (req, res, next) => {
        console.log('requireRole check:', { 
            path: req.path, 
            adminId: req.session.adminId, 
            adminRole: req.session.adminRole, 
            requiredRoles: roles 
        });
        
        if (!req.session.adminId) {
            console.log('No adminId in session');
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        
        // Get admin role from session or fetch from database
        if (!req.session.adminRole) {
            db.get("SELECT role FROM admins WHERE id = ?", [req.session.adminId], (err, admin) => {
                if (err || !admin) {
                    return res.status(401).json({ success: false, message: 'Invalid admin' });
                }
                req.session.adminRole = admin.role;
                if (!roles.includes(admin.role)) {
                    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
                }
                next();
            });
        } else {
            if (!roles.includes(req.session.adminRole)) {
                return res.status(403).json({ success: false, message: 'Insufficient permissions' });
            }
            next();
        }
    };
}

// API Routes

// Admin Authentication
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt:', { username, hasPassword: !!password });
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
    }
    
    db.get("SELECT * FROM admins WHERE username = ?", [username], (err, admin) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!admin) {
            console.log('User not found:', username);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const passwordMatch = bcrypt.compareSync(password, admin.password);
        console.log('Password match:', passwordMatch);
        console.log('Admin data from DB:', admin);
        
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        // Check if account is active
        if (admin.is_active === 0) {
            console.log('Account is deactivated:', username);
            return res.status(401).json({ success: false, message: 'Account is deactivated' });
        }
        
        // Ensure role is set - if null, set to super_admin for admin user
        const userRole = admin.role || (admin.username === 'admin' ? 'super_admin' : 'doctor');
        
        req.session.adminId = admin.id;
        req.session.adminUsername = admin.username;
        req.session.adminRole = userRole;
        
        console.log('Login successful for:', admin.username, 'Role:', userRole);
        res.json({ 
            success: true, 
            admin: { 
                id: admin.id, 
                username: admin.username, 
                full_name: admin.full_name,
                role: userRole,
                assigned_subject_id: admin.assigned_subject_id
            } 
        });
    });
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Check admin session
app.get('/api/admin/check', (req, res) => {
    if (req.session.adminId) {
        // Get admin info from database to ensure we have the latest role
        db.get("SELECT id, username, full_name, role, assigned_subject_id FROM admins WHERE id = ?", [req.session.adminId], (err, admin) => {
            if (err || !admin) {
                return res.json({ authenticated: false });
            }
            
            res.json({ 
                authenticated: true, 
                admin: { 
                    id: admin.id, 
                    username: admin.username,
                    full_name: admin.full_name,
                    role: admin.role,
                    assigned_subject_id: admin.assigned_subject_id
                } 
            });
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Super Admin APIs
// Get all doctors (Super Admin only)
app.get('/api/admin/doctors', requireRole(['super_admin']), (req, res) => {
    db.all(`
        SELECT 
            a.*,
            COALESCE(subj.subjects_names, '') as subjects_names,
            COALESCE(subj.subjects_ids, '') as subjects_ids,
            COALESCE(subj.subjects_count, 0) as subjects_count,
            COALESCE(lec.lectures_count, 0) as lectures_count
        FROM admins a
        LEFT JOIN (
            SELECT 
                ds.doctor_id,
                GROUP_CONCAT(s.name, ', ') as subjects_names,
                GROUP_CONCAT(s.id) as subjects_ids,
                COUNT(DISTINCT s.id) as subjects_count
            FROM doctor_subjects ds
            JOIN subjects s ON ds.subject_id = s.id AND s.is_active = 1
            GROUP BY ds.doctor_id
        ) subj ON a.id = subj.doctor_id
        LEFT JOIN (
            SELECT 
                created_by,
                COUNT(*) as lectures_count
            FROM lectures
            WHERE is_active = 1
            GROUP BY created_by
        ) lec ON a.id = lec.created_by
        WHERE a.role = 'doctor'
        ORDER BY a.created_at DESC
    `, (err, doctors) => {
        if (err) {
            console.error('Error fetching doctors:', err);
            return res.status(500).json({ success: false, message: 'Failed to fetch doctors', error: err.message });
        }
        console.log('Fetched doctors successfully:', doctors);
        res.json({ success: true, doctors });
    });
});

// Create new doctor (Super Admin only)
app.post('/api/admin/doctors', requireRole(['super_admin']), (req, res) => {
    const { username, password, full_name, email, subject_ids } = req.body;
    
    if (!username || !password || !full_name) {
        return res.status(400).json({ success: false, message: 'Username, password, and full name are required' });
    }
    
    if (!subject_ids || !Array.isArray(subject_ids) || subject_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one subject must be selected' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run(`INSERT INTO admins (username, password, full_name, email, role, created_by) 
            VALUES (?, ?, ?, ?, 'doctor', ?)`, 
            [username, hashedPassword, full_name, email, req.session.adminId], function(err) {
        if (err) {
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return res.status(400).json({ success: false, message: 'Username already exists' });
            }
            return res.status(500).json({ success: false, message: 'Failed to create doctor' });
        }
        
        const doctorId = this.lastID;
        
        // Insert doctor-subject relationships
        const insertStmt = db.prepare(`INSERT INTO doctor_subjects (doctor_id, subject_id) VALUES (?, ?)`);
        let insertedCount = 0;
        
        subject_ids.forEach((subjectId, index) => {
            insertStmt.run([doctorId, subjectId], (err) => {
                if (err) {
                    console.error('Error inserting doctor-subject relationship:', err);
                } else {
                    insertedCount++;
                }
                
                if (index === subject_ids.length - 1) {
                    insertStmt.finalize();
                    res.json({ success: true, doctorId });
                }
            });
        });
    });
});

// Get all subjects (Super Admin can see all)
app.get('/api/admin/subjects/all', requireRole(['super_admin']), (req, res) => {
    console.log('Fetching all subjects for super admin...');
    
    // Query with level_name included
    let query = `SELECT s.*, a.full_name as admin_name, l.name as level_name 
                 FROM subjects s 
                 LEFT JOIN admins a ON s.admin_id = a.id 
                 LEFT JOIN levels l ON s.level_id = l.id
                 WHERE s.is_active = 1
                 ORDER BY l.order_number ASC, s.name ASC`;
    
    db.all(query, (err, subjects) => {
        if (err) {
            console.log('Error with is_active filter, trying without it:', err.message);
            
            // Try without the is_active filter in case the column doesn't exist
            query = `SELECT s.*, a.full_name as admin_name, l.name as level_name 
                     FROM subjects s 
                     LEFT JOIN admins a ON s.admin_id = a.id
                     LEFT JOIN levels l ON s.level_id = l.id
                     ORDER BY l.order_number ASC, s.name ASC`;
            
            db.all(query, (err2, subjects2) => {
                if (err2) {
                    console.error('Error fetching subjects:', err2);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Failed to fetch subjects: ' + err2.message 
                    });
                }
                console.log('Successfully fetched subjects:', subjects2);
                res.json({ success: true, subjects: subjects2 || [] });
            });
        } else {
            console.log('Successfully fetched subjects:', subjects);
            res.json({ success: true, subjects: subjects || [] });
        }
    });
});

// Create new subject (Super Admin only)
app.post('/api/admin/subjects/create', requireRole(['super_admin']), (req, res) => {
    const { name, code, description, admin_id } = req.body;
    
    console.log('Creating subject:', { name, code, description, admin_id });
    
    if (!name) {
        return res.status(400).json({ success: false, message: 'Subject name is required' });
    }
    
    db.run(`INSERT INTO subjects (name, code, description, admin_id, is_active) VALUES (?, ?, ?, ?, 1)`, 
            [name, code || null, description || null, admin_id || null], function(err) {
        if (err) {
            console.error('Error creating subject:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to create subject: ' + err.message 
            });
        }
        console.log('Subject created successfully with ID:', this.lastID);
        res.json({ success: true, subjectId: this.lastID });
    });
});

// Update subject (Super Admin only)
app.put('/api/admin/subjects/:id', requireRole(['super_admin']), (req, res) => {
    const { id } = req.params;
    const { name, code, description, admin_id, is_active } = req.body;
    
    console.log('Updating subject:', { id, name, code, description, admin_id, is_active });
    
    if (!name) {
        return res.status(400).json({ success: false, message: 'Subject name is required' });
    }
    
    db.run(`UPDATE subjects SET name = ?, code = ?, description = ?, admin_id = ?, is_active = ? WHERE id = ?`, 
            [name, code || null, description || null, admin_id || null, is_active !== undefined ? is_active : 1, id], function(err) {
        if (err) {
            console.error('Error updating subject:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to update subject: ' + err.message 
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Subject not found' });
        }
        
        console.log('Subject updated successfully');
        res.json({ success: true, message: 'Subject updated successfully' });
    });
});

// Delete subject (Super Admin only)
// Delete subject endpoint removed - using new one below with cascade delete

// Update doctor (Super Admin only)
app.put('/api/admin/doctors/:id', requireRole(['super_admin']), (req, res) => {
    const { id } = req.params;
    const { full_name, email, subject_ids, is_active, password } = req.body;
    
    console.log('Updating doctor:', { id, full_name, email, subject_ids, is_active });
    
    if (!full_name) {
        return res.status(400).json({ success: false, message: 'Full name is required' });
    }
    
    if (!subject_ids || !Array.isArray(subject_ids) || subject_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one subject must be selected' });
    }
    
    // Update doctor basic info
    let updateQuery, updateParams;
    if (password && password.trim()) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        updateQuery = `UPDATE admins SET full_name = ?, email = ?, is_active = ?, password = ? WHERE id = ? AND role = 'doctor'`;
        updateParams = [full_name, email || null, is_active !== undefined ? is_active : 1, hashedPassword, id];
    } else {
        updateQuery = `UPDATE admins SET full_name = ?, email = ?, is_active = ? WHERE id = ? AND role = 'doctor'`;
        updateParams = [full_name, email || null, is_active !== undefined ? is_active : 1, id];
    }
    
    db.run(updateQuery, updateParams, function(err) {
        if (err) {
            console.error('Error updating doctor:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to update doctor: ' + err.message 
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }
        
        // Update doctor-subject relationships
        // First, delete existing relationships
        db.run(`DELETE FROM doctor_subjects WHERE doctor_id = ?`, [id], (err) => {
            if (err) {
                console.error('Error deleting doctor-subject relationships:', err);
                return res.status(500).json({ success: false, message: 'Failed to update doctor subjects' });
            }
            
            // Insert new relationships
            const insertStmt = db.prepare(`INSERT INTO doctor_subjects (doctor_id, subject_id) VALUES (?, ?)`);
            let insertedCount = 0;
            
            subject_ids.forEach((subjectId, index) => {
                insertStmt.run([id, subjectId], (err) => {
                    if (err) {
                        console.error('Error inserting doctor-subject relationship:', err);
                    } else {
                        insertedCount++;
                    }
                    
                    if (index === subject_ids.length - 1) {
                        insertStmt.finalize();
                        console.log('Doctor updated successfully');
                        res.json({ success: true, message: 'Doctor updated successfully' });
                    }
                });
            });
        });
    });
});

// Delete doctor (Super Admin only)
app.delete('/api/admin/doctors/:id', requireRole(['super_admin']), (req, res) => {
    const { id } = req.params;
    
    console.log('Deleting doctor with cascade:', id);
    
    // Check if doctor exists and is not the current admin
    db.get("SELECT * FROM admins WHERE id = ? AND role = 'doctor'", [id], (err, doctor) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }
        
        if (doctor.id === req.session.adminId) {
            return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
        }
        
        // Start cascade delete: Delete attendance records for lectures created by this doctor
        db.run(`DELETE FROM attendance WHERE lecture_id IN (SELECT id FROM lectures WHERE created_by = ?)`, [id], function(err) {
            if (err) {
                console.error('Error deleting attendance records:', err);
                return res.status(500).json({ success: false, message: 'فشل في حذف سجلات الحضور' });
            }
            
            console.log(`Deleted ${this.changes} attendance records for doctor ${id}`);
            
            // Delete failed attempts for lectures created by this doctor
            db.run(`DELETE FROM failed_attempts WHERE lecture_id IN (SELECT id FROM lectures WHERE created_by = ?)`, [id], function(err) {
                if (err) {
                    console.error('Error deleting failed attempts:', err);
                    return res.status(500).json({ success: false, message: 'فشل في حذف سجلات المحاولات الفاشلة' });
                }
                
                console.log(`Deleted ${this.changes} failed attempts for doctor ${id}`);
                
                // Delete lectures created by this doctor
                db.run(`DELETE FROM lectures WHERE created_by = ?`, [id], function(err) {
                    if (err) {
                        console.error('Error deleting lectures:', err);
                        return res.status(500).json({ success: false, message: 'فشل في حذف المحاضرات' });
                    }
                    
                    console.log(`Deleted ${this.changes} lectures for doctor ${id}`);
                    
                    // Delete doctor_subjects mappings
                    db.run(`DELETE FROM doctor_subjects WHERE doctor_id = ?`, [id], function(err) {
                        if (err) {
                            console.error('Error deleting doctor_subjects:', err);
                            return res.status(500).json({ success: false, message: 'فشل في حذف ارتباطات المواد' });
                        }
                        
                        console.log(`Deleted ${this.changes} doctor_subjects mappings for doctor ${id}`);
                        
                        // Finally delete the doctor account
                        db.run(`DELETE FROM admins WHERE id = ? AND role = 'doctor'`, [id], function(err2) {
                            if (err2) {
                                console.error('Error deleting doctor:', err2);
                                return res.status(500).json({ 
                                    success: false, 
                                    message: 'Failed to delete doctor: ' + err2.message 
                                });
                            }
                            
                            console.log('Doctor and all related data deleted successfully');
                            res.json({ success: true, message: 'تم حذف الدكتور وجميع محاضراته بنجاح' });
                        });
                    });
                });
            });
        });
    });
});

// ==================== LEVELS API ====================

// Get all levels
app.get('/api/admin/levels', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    db.all(`
        SELECT 
            l.*,
            COUNT(s.id) as subjects_count
        FROM levels l
        LEFT JOIN subjects s ON l.id = s.level_id AND s.is_active = 1
        WHERE l.is_active = 1
        GROUP BY l.id
        ORDER BY l.order_number ASC, l.name ASC
    `, (err, levels) => {
        if (err) {
            console.error('Error fetching levels:', err);
            return res.status(500).json({ success: false, message: 'Failed to fetch levels' });
        }
        res.json({ success: true, levels });
    });
});

// Create new level (Super Admin only)
app.post('/api/admin/levels', requireRole(['super_admin']), (req, res) => {
    const { name, description, order_number } = req.body;
    
    if (!name) {
        return res.status(400).json({ success: false, message: 'اسم المرحلة مطلوب' });
    }
    
    db.run(`INSERT INTO levels (name, description, order_number) VALUES (?, ?, ?)`,
        [name, description || null, order_number || null],
        function(err) {
            if (err) {
                console.error('Error creating level:', err);
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ success: false, message: 'اسم المرحلة موجود بالفعل' });
                }
                return res.status(500).json({ success: false, message: 'فشل في إضافة المرحلة' });
            }
            res.json({ success: true, levelId: this.lastID });
        }
    );
});

// Update level (Super Admin only)
app.put('/api/admin/levels/:id', requireRole(['super_admin']), (req, res) => {
    const { id } = req.params;
    const { name, description, order_number, is_active } = req.body;
    
    if (!name) {
        return res.status(400).json({ success: false, message: 'اسم المرحلة مطلوب' });
    }
    
    db.run(`UPDATE levels SET name = ?, description = ?, order_number = ?, is_active = ? WHERE id = ?`,
        [name, description || null, order_number || null, is_active !== undefined ? is_active : 1, id],
        function(err) {
            if (err) {
                console.error('Error updating level:', err);
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ success: false, message: 'اسم المرحلة موجود بالفعل' });
                }
                return res.status(500).json({ success: false, message: 'فشل في تحديث المرحلة' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ success: false, message: 'المرحلة غير موجودة' });
            }
            res.json({ success: true });
        }
    );
});

// Delete level (Super Admin only)
app.delete('/api/admin/levels/:id', requireRole(['super_admin']), (req, res) => {
    const { id } = req.params;
    
    // Check if level has subjects
    db.get(`SELECT COUNT(*) as count FROM subjects WHERE level_id = ?`, [id], (err, result) => {
        if (err) {
            console.error('Error checking level subjects:', err);
            return res.status(500).json({ success: false, message: 'خطأ في التحقق من المواد' });
        }
        
        if (result.count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `لا يمكن حذف المرحلة لأنها تحتوي على ${result.count} مادة. قم بحذف أو نقل المواد أولاً.` 
            });
        }
        
        // Safe to delete
        db.run(`DELETE FROM levels WHERE id = ?`, [id], function(err) {
            if (err) {
                console.error('Error deleting level:', err);
                return res.status(500).json({ success: false, message: 'فشل في حذف المرحلة' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ success: false, message: 'المرحلة غير موجودة' });
            }
            res.json({ success: true });
        });
    });
});

// Get subjects by level
app.get('/api/admin/levels/:id/subjects', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { id } = req.params;
    
    db.all(`SELECT s.*, l.name as level_name 
            FROM subjects s 
            LEFT JOIN levels l ON s.level_id = l.id 
            WHERE s.level_id = ? AND s.is_active = 1
            ORDER BY s.name ASC`, [id], (err, subjects) => {
        if (err) {
            console.error('Error fetching level subjects:', err);
            return res.status(500).json({ success: false, message: 'Failed to fetch subjects' });
        }
        res.json({ success: true, subjects });
    });
});

// ==================== SUBJECTS API ====================

// Get all subjects for admin (role-based access)
app.get('/api/admin/subjects', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    console.log('Subjects API accessed by:', { adminId: req.session.adminId, adminRole: req.session.adminRole });
    
    // Get role from session or fetch from database
    const userRole = req.session.adminRole;
    
    function fetchSubjectsWithRole(role) {
        const query = role === 'super_admin' 
            ? `SELECT s.*, a.full_name as admin_name, l.name as level_name 
               FROM subjects s 
               LEFT JOIN admins a ON s.admin_id = a.id 
               LEFT JOIN levels l ON s.level_id = l.id 
               WHERE s.is_active = 1 
               ORDER BY l.order_number ASC, s.name ASC`
            : `SELECT s.*, l.name as level_name 
               FROM subjects s 
               LEFT JOIN levels l ON s.level_id = l.id 
               WHERE s.admin_id = ? OR s.id IN (SELECT assigned_subject_id FROM admins WHERE id = ?) 
               ORDER BY l.order_number ASC, s.name ASC`;
        
        const params = role === 'super_admin' ? [] : [req.session.adminId, req.session.adminId];
        
            db.all(query, params, (err, subjects) => {
                if (err) {
                    console.error('Error fetching subjects:', err);
                    return res.status(500).json({ success: false, message: 'Failed to fetch subjects' });
                }
                console.log(`Subjects API returning ${subjects.length} subjects`);
                res.json({ success: true, subjects });
            });
        }
    
    if (userRole) {
        fetchSubjectsWithRole(userRole);
    } else {
        // Fetch role from database if not in session
        db.get('SELECT role FROM admins WHERE id = ?', [req.session.adminId], (err, admin) => {
            if (err || !admin) {
                return res.status(401).json({ success: false, message: 'Admin not found' });
            }
            req.session.adminRole = admin.role;
            fetchSubjectsWithRole(admin.role);
        });
    }
});

// Create new subject (Super Admin only)
app.post('/api/admin/subjects', requireRole(['super_admin']), (req, res) => {
    const { name, code, description, level_id } = req.body;
    
    if (!name) {
        return res.status(400).json({ success: false, message: 'اسم المادة مطلوب' });
    }
    
    if (!level_id) {
        return res.status(400).json({ success: false, message: 'المرحلة الدراسية مطلوبة' });
    }
    
    db.run(`INSERT INTO subjects (name, code, description, level_id, admin_id) VALUES (?, ?, ?, ?, ?)`,
        [name, code || null, description || null, level_id, req.session.adminId],
        function(err) {
            if (err) {
                console.error('Error creating subject:', err);
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ success: false, message: 'كود المادة موجود بالفعل' });
                }
                return res.status(500).json({ success: false, message: 'فشل في إضافة المادة' });
            }
            res.json({ success: true, subjectId: this.lastID });
        }
    );
});

// Update subject (Super Admin only)
app.put('/api/admin/subjects/:id', requireRole(['super_admin']), (req, res) => {
    const { id } = req.params;
    const { name, code, description, level_id, is_active } = req.body;
    
    if (!name) {
        return res.status(400).json({ success: false, message: 'اسم المادة مطلوب' });
    }
    
    if (!level_id) {
        return res.status(400).json({ success: false, message: 'المرحلة الدراسية مطلوبة' });
    }
    
    db.run(`UPDATE subjects SET name = ?, code = ?, description = ?, level_id = ?, is_active = ? WHERE id = ?`,
        [name, code || null, description || null, level_id, is_active !== undefined ? is_active : 1, id],
        function(err) {
            if (err) {
                console.error('Error updating subject:', err);
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ success: false, message: 'كود المادة موجود بالفعل' });
                }
                return res.status(500).json({ success: false, message: 'فشل في تحديث المادة' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
            }
            res.json({ success: true });
        }
    );
});

// Delete subject (Super Admin only) - CASCADE DELETE
app.delete('/api/admin/subjects/:id', requireRole(['super_admin']), (req, res) => {
    const { id } = req.params;
    
    console.log('Deleting subject with cascade:', id);
    
    // Start cascade delete: Delete attendance records for lectures of this subject
    db.run(`DELETE FROM attendance WHERE lecture_id IN (SELECT id FROM lectures WHERE subject_id = ?)`, [id], function(err) {
        if (err) {
            console.error('Error deleting attendance records:', err);
            return res.status(500).json({ success: false, message: 'فشل في حذف سجلات الحضور' });
        }
        
        console.log(`Deleted ${this.changes} attendance records`);
        
        // Delete failed attempts for lectures of this subject
        db.run(`DELETE FROM failed_attempts WHERE lecture_id IN (SELECT id FROM lectures WHERE subject_id = ?)`, [id], function(err) {
            if (err) {
                console.error('Error deleting failed attempts:', err);
                return res.status(500).json({ success: false, message: 'فشل في حذف سجلات المحاولات الفاشلة' });
            }
            
            console.log(`Deleted ${this.changes} failed attempts`);
            
            // Delete lectures for this subject
            db.run(`DELETE FROM lectures WHERE subject_id = ?`, [id], function(err) {
                if (err) {
                    console.error('Error deleting lectures:', err);
                    return res.status(500).json({ success: false, message: 'فشل في حذف المحاضرات' });
                }
                
                console.log(`Deleted ${this.changes} lectures`);
                
                // Delete doctor_subjects mappings
                db.run(`DELETE FROM doctor_subjects WHERE subject_id = ?`, [id], function(err) {
                    if (err) {
                        console.error('Error deleting doctor_subjects:', err);
                        return res.status(500).json({ success: false, message: 'فشل في حذف ارتباطات الدكاترة' });
                    }
                    
                    console.log(`Deleted ${this.changes} doctor_subjects mappings`);
                    
                    // Finally delete the subject itself
                    db.run(`DELETE FROM subjects WHERE id = ?`, [id], function(err) {
                        if (err) {
                            console.error('Error deleting subject:', err);
                            return res.status(500).json({ success: false, message: 'فشل في حذف المادة' });
                        }
                        
                        if (this.changes === 0) {
                            return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
                        }
                        
                        console.log('Subject and all related data deleted successfully');
                        res.json({ success: true, message: 'تم حذف المادة وجميع محاضراتها بنجاح' });
                    });
                });
            });
        });
    });
});

// Create new lecture with QR code (Doctors and Super Admin)
app.post('/api/admin/lectures', requireRole(['doctor', 'super_admin']), async (req, res) => {
    const { title, date, start_time, lecture_type, group_number, section_number, subject_id, qr_refresh_interval } = req.body;
    const qrCode = uuidv4();
    
    console.log('Creating lecture - Session:', { adminId: req.session.adminId, adminRole: req.session.adminRole });
    console.log('Creating lecture:', { title, date, start_time, lecture_type, group_number, section_number, subject_id, qr_refresh_interval });
    
    if (!subject_id) {
        return res.status(400).json({ success: false, message: 'Subject must be selected' });
    }
    
    // Check user role and verify access
    const userRole = req.session.adminRole;
    
    if (userRole === 'super_admin') {
        // Super admin can create lectures for any subject - skip access check
        console.log('Super admin creating lecture, skipping access check');
    } else {
        // Verify doctor has access to this subject
        console.log('Verifying doctor access to subject:', subject_id);
        db.get(`SELECT ds.* FROM doctor_subjects ds WHERE ds.doctor_id = ? AND ds.subject_id = ?`, 
               [req.session.adminId, subject_id], (err, accessCheck) => {
            if (err) {
                console.error('Error checking doctor access:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            console.log('Access check result:', accessCheck);
            
            if (!accessCheck) {
                // Try fallback with assigned_subject_id
                console.log('No access found in doctor_subjects, trying fallback with assigned_subject_id');
                db.get('SELECT assigned_subject_id FROM admins WHERE id = ?', [req.session.adminId], (err, admin) => {
                    if (err || !admin || admin.assigned_subject_id != subject_id) {
                        console.log('Fallback failed, doctor has no access to this subject');
                        return res.status(400).json({ success: false, message: 'You do not have access to this subject' });
                    }
                    
                    console.log('Fallback successful, creating lecture');
                    createLecture();
                });
                return;
            }
            
            // Continue with lecture creation
            console.log('Access confirmed, creating lecture');
            createLecture();
        });
        
        // Return early for doctor role - lecture creation will happen in callback
        return;
    }
    
    // For super admin, create lecture directly
    createLecture();
    
    function createLecture() {
        
        // Calculate end time (2 hours after start time)
        const startTimeObj = new Date(`1970-01-01T${start_time}:00`);
        const endTimeObj = new Date(startTimeObj.getTime() + (2 * 60 * 60 * 1000)); // Add 2 hours
        const end_time = endTimeObj.toTimeString().slice(0, 5);
        
        const createdBy = req.session.adminId;
        console.log('Creating lecture with created_by:', createdBy);

        const refreshInterval = qr_refresh_interval ? parseInt(qr_refresh_interval, 10) : 0;
        const expiresAt = refreshInterval > 0 ? new Date(Date.now() + refreshInterval * 1000).toISOString() : null;
        
        db.run(`INSERT INTO lectures (subject_id, title, date, start_time, end_time, qr_code, lecture_type, group_number, section_number, created_by, qr_refresh_interval, qr_code_expires_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [subject_id, title, date, start_time, end_time, qrCode, lecture_type || 'lecture', group_number || null, section_number || null, createdBy, refreshInterval, expiresAt], function(err) {
            if (err) {
                console.error('Error creating lecture:', err);
                return res.status(500).json({ success: false, message: 'Failed to create lecture: ' + err.message });
            }
            console.log('Lecture created successfully with ID:', this.lastID, 'created_by:', createdBy);
            res.json({ success: true, lectureId: this.lastID, qrCode });
        });
    }
});

// Get lectures for current doctor's assigned subject
app.get('/api/admin/lectures', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    if (req.session.adminRole === 'super_admin') {
        // Super admin can see all lectures with creator info
        db.all(`SELECT l.*, s.name as subject_name, 
                a.full_name as created_by_name
                FROM lectures l 
                JOIN subjects s ON l.subject_id = s.id 
                LEFT JOIN admins a ON l.created_by = a.id
                ORDER BY l.created_at DESC, l.date DESC, l.start_time DESC`, (err, lectures) => {
            if (err) {
                console.error('Error fetching all lectures for super admin:', err);
                return res.status(500).json({ success: false, message: 'Failed to fetch lectures' });
            }
            console.log(`Super Admin: Found ${lectures.length} total lectures`);
            lectures.forEach(lec => {
                console.log(`Lecture ${lec.id}: "${lec.title}" - created_by: ${lec.created_by}, creator: ${lec.created_by_name}`);
            });
            res.json({ success: true, lectures });
        });
    } else {
        // Doctor can only see lectures THEY created from their assigned subjects
        db.all(`SELECT DISTINCT l.*, s.name as subject_name 
                FROM lectures l 
                JOIN subjects s ON l.subject_id = s.id 
                JOIN doctor_subjects ds ON s.id = ds.subject_id
                WHERE ds.doctor_id = ? AND l.created_by = ? AND l.created_by IS NOT NULL
                ORDER BY l.created_at DESC, l.date DESC, l.start_time DESC`, 
                [req.session.adminId, req.session.adminId], (err, lectures) => {
            if (err) {
                console.error('Error fetching doctor lectures:', err);
                return res.status(500).json({ success: false, message: 'Failed to fetch lectures' });
            }
            console.log(`Found ${lectures.length} lectures created by doctor ${req.session.adminId}`);
            res.json({ success: true, lectures });
        });
    }
});

// Generate QR code image
app.get('/api/qr/:qrCode', async (req, res) => {
    const { qrCode } = req.params;
    
    try {
        // Generate QR code with larger size for better display on projector screens
        const qrDataURL = await QRCode.toDataURL(qrCode, {
            width: 800,           // Increased from default 256px to 800px
            margin: 2,            // Margin around QR code
            errorCorrectionLevel: 'H'  // High error correction for better scanning
        });
        // Extract base64 part without data:image/png;base64 prefix
        const base64Image = qrDataURL.split(',')[1];
        res.json({ success: true, qrImage: base64Image });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to generate QR code' });
    }
});

// Get lecture info from QR code
app.get('/api/lecture/qr/:qrCode', (req, res) => {
    const { qrCode } = req.params;
    console.log('QR Code lookup request:', qrCode);
    
    db.get(`SELECT l.*, s.name as subject_name 
            FROM lectures l 
            JOIN subjects s ON l.subject_id = s.id 
            WHERE l.qr_code = ? AND l.is_active = 1`, [qrCode], (err, lecture) => {
        if (err) {
            console.error('Database error in QR lookup:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!lecture) {
            console.log('No lecture found for QR code:', qrCode);
            return res.status(404).json({ success: false, message: 'Invalid or expired QR code' });
        }

        if (lecture.qr_code_expires_at) {
            const expiresAt = new Date(lecture.qr_code_expires_at);
            if (expiresAt < new Date()) {
                return res.status(400).json({ success: false, message: 'QR code has expired' });
            }
        }
        
        console.log('Lecture found:', lecture);
        res.json({ success: true, lecture });
    });
});

// Add manual attendance (Doctor only)
app.post('/api/admin/attendance/manual', requireRole(['doctor', 'super_admin']), (req, res) => {
    const { lecture_id, student_id, student_name, group_number, section_number } = req.body;
    const adminId = req.session.adminId;
    
    console.log('Adding manual attendance:', { lecture_id, student_id, student_name, group_number, section_number, adminId });
    
    // Validate required fields
    if (!lecture_id || !student_id || !student_name) {
        return res.status(400).json({ success: false, message: 'البيانات المطلوبة ناقصة' });
    }
    
    // First get lecture info
    db.get(`SELECT l.*, s.name as subject_name 
            FROM lectures l 
            JOIN subjects s ON l.subject_id = s.id 
            WHERE l.id = ?`, [lecture_id], (err, lecture) => {
        if (err) {
            console.error('Error fetching lecture:', err);
            return res.status(500).json({ success: false, message: 'خطأ في قاعدة البيانات' });
        }
        
        if (!lecture) {
            return res.status(404).json({ success: false, message: 'المحاضرة غير موجودة' });
        }
        
        // Check if doctor owns this lecture
        if (req.session.adminRole === 'doctor' && lecture.created_by !== adminId) {
            return res.status(403).json({ success: false, message: 'غير مصرح لك بإضافة حضور لهذه المحاضرة' });
        }
        
        // Check if lecture is finished
        if (lecture.lecture_finished) {
            return res.status(400).json({ success: false, message: 'المحاضرة منتهية' });
        }
        
        // Validate required fields based on lecture type
        if (lecture.lecture_type === 'section' && !section_number) {
            return res.status(400).json({ success: false, message: 'رقم السكشن مطلوب' });
        }
        
        if (!group_number) {
            return res.status(400).json({ success: false, message: 'رقم المجموعة مطلوب' });
        }
        
        // Check if already registered
        db.get("SELECT * FROM attendance WHERE lecture_id = ? AND student_id = ?", 
               [lecture_id, student_id], (err, existing) => {
            if (err) {
                console.error('Error checking existing attendance:', err);
                return res.status(500).json({ success: false, message: 'خطأ في قاعدة البيانات' });
            }
            
            if (existing) {
                return res.status(400).json({ success: false, message: 'الطالب مسجل بالفعل في هذه المحاضرة' });
            }
            
            // Register attendance (manual entry - no session_id)
            db.run(`INSERT INTO attendance (lecture_id, student_id, student_name, group_number, section_number, session_id) 
                    VALUES (?, ?, ?, ?, ?, ?)`, 
                    [lecture_id, student_id, student_name, group_number, section_number, 'manual_' + adminId], function(err) {
                if (err) {
                    console.error('Error registering manual attendance:', err);
                    return res.status(500).json({ success: false, message: 'فشل في تسجيل الحضور' });
                }
                console.log('Manual attendance registered successfully for student:', student_id);
                res.json({ success: true, message: 'تم تسجيل الحضور بنجاح' });
            });
        });
    });
});

// Accept failed attempt (convert failed to successful)
app.post('/api/admin/attendance/accept-failed', requireRole(['doctor', 'super_admin']), (req, res) => {
    const { lecture_id, student_id, failed_attempt_id } = req.body;
    const adminId = req.session.adminId;
    
    console.log('Accepting failed attempt:', { lecture_id, student_id, failed_attempt_id, adminId });
    
    // Validate required fields
    if (!lecture_id || !student_id || !failed_attempt_id) {
        return res.status(400).json({ success: false, message: 'البيانات المطلوبة ناقصة' });
    }
    
    // First get the failed attempt details
    db.get(`SELECT * FROM failed_attempts WHERE id = ? AND lecture_id = ? AND student_id = ?`, 
           [failed_attempt_id, lecture_id, student_id], (err, failedAttempt) => {
        if (err) {
            console.error('Error fetching failed attempt:', err);
            return res.status(500).json({ success: false, message: 'خطأ في قاعدة البيانات' });
        }
        
        if (!failedAttempt) {
            return res.status(404).json({ success: false, message: 'المحاولة الفاشلة غير موجودة' });
        }
        
        // Get lecture info
        db.get(`SELECT l.*, s.name as subject_name 
                FROM lectures l 
                JOIN subjects s ON l.subject_id = s.id 
                WHERE l.id = ?`, [lecture_id], (err, lecture) => {
            if (err) {
                console.error('Error fetching lecture:', err);
                return res.status(500).json({ success: false, message: 'خطأ في قاعدة البيانات' });
            }
            
            if (!lecture) {
                return res.status(404).json({ success: false, message: 'المحاضرة غير موجودة' });
            }
            
            // Check if doctor owns this lecture
            if (req.session.adminRole === 'doctor' && lecture.created_by !== adminId) {
                return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل حضور هذه المحاضرة' });
            }
            
            // Check if already registered in attendance
            db.get("SELECT * FROM attendance WHERE lecture_id = ? AND student_id = ?", 
                   [lecture_id, student_id], (err, existing) => {
                if (err) {
                    console.error('Error checking existing attendance:', err);
                    return res.status(500).json({ success: false, message: 'خطأ في قاعدة البيانات' });
                }
                
                if (existing) {
                    return res.status(400).json({ success: false, message: 'الطالب مسجل بالفعل في هذه المحاضرة' });
                }
                
                // Start transaction-like operations
                // 1. Insert into attendance table
                const studentName = failedAttempt.student_name || 'غير محدد';
                const groupNumber = failedAttempt.group_number || null;
                const sectionNumber = failedAttempt.section_number || null;
                
                db.run(`INSERT INTO attendance (lecture_id, student_id, student_name, group_number, section_number, session_id) 
                        VALUES (?, ?, ?, ?, ?, ?)`, 
                        [lecture_id, student_id, studentName, groupNumber, sectionNumber, 'accepted_' + adminId], function(err) {
                    if (err) {
                        console.error('Error registering attendance from failed attempt:', err);
                        return res.status(500).json({ success: false, message: 'فشل في تسجيل الحضور' });
                    }
                    
                    // 2. Delete from failed_attempts table
                    db.run(`DELETE FROM failed_attempts WHERE id = ?`, [failed_attempt_id], function(deleteErr) {
                        if (deleteErr) {
                            console.error('Error deleting failed attempt:', deleteErr);
                            // Even if delete fails, attendance is registered, so we consider it a success
                        }
                        
                        console.log('Failed attempt accepted and moved to attendance for student:', student_id);
                        res.json({ 
                            success: true, 
                            message: 'تم قبول الطالب وتسجيل حضوره بنجاح',
                            attendance_id: this.lastID
                        });
                    });
                });
            });
        });
    });
});

// Register attendance
app.post('/api/attendance/register', (req, res) => {
    const { lecture_id, student_id, student_name, group_number, section_number } = req.body;
    const sessionId = req.sessionID;
    
    console.log('Registering attendance:', { lecture_id, student_id, student_name, group_number, section_number });
    
    // First get lecture info to validate required fields
    db.get("SELECT l.*, s.name as subject_name FROM lectures l JOIN subjects s ON l.subject_id = s.id WHERE l.id = ?", [lecture_id], (err, lecture) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!lecture) {
            return res.status(404).json({ success: false, message: 'Lecture not found' });
        }
        
        // Check if attendance is finished
        if (lecture.attendance_finished) {
            return res.status(400).json({ success: false, message: 'Attendance registration has been closed' });
        }
        
        // Check if lecture is finished
        if (lecture.lecture_finished) {
            return res.status(400).json({ success: false, message: 'This lecture has ended' });
        }
        
        // Validate required fields based on lecture type
        if (lecture.lecture_type === 'section' && !section_number) {
            return res.status(400).json({ success: false, message: 'Section number is required for sections' });
        }
        
        if (!group_number) {
            return res.status(400).json({ success: false, message: 'Group number is required' });
        }
        
        // Check if already registered for this lecture
        db.get("SELECT * FROM attendance WHERE lecture_id = ? AND student_id = ?", 
               [lecture_id, student_id], (err, existing) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            if (existing) {
                db.run("INSERT INTO failed_attempts (lecture_id, student_id, student_name, group_number, section_number, reason) VALUES (?, ?, ?, ?, ?, ?)",
                       [lecture_id, student_id, student_name, group_number, section_number, 'Duplicate registration attempt'], () => {});
                return res.json({ success: false, message: 'Already registered for this lecture' });
            }
            
            // Check if session already used for this lecture
            db.get("SELECT * FROM attendance WHERE lecture_id = ? AND session_id = ?",
                   [lecture_id, sessionId], (err, sessionExists) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Database error' });
                }
                
                if (sessionExists) {
                    db.run("INSERT INTO failed_attempts (lecture_id, student_id, student_name, group_number, section_number, reason) VALUES (?, ?, ?, ?, ?, ?)",
                           [lecture_id, student_id, student_name, group_number, section_number, 'Session already used'], () => {});
                    return res.json({ success: false, message: 'This device is already registered for this lecture' });
                }
                
                // Register attendance
                db.run(`INSERT INTO attendance (lecture_id, student_id, student_name, group_number, section_number, session_id) 
                        VALUES (?, ?, ?, ?, ?, ?)`, 
                        [lecture_id, student_id, student_name, group_number, section_number, sessionId], function(err) {
                    if (err) {
                        console.error('Error registering attendance:', err);
                        db.run("INSERT INTO failed_attempts (lecture_id, student_id, student_name, group_number, section_number, reason) VALUES (?, ?, ?, ?, ?, ?)",
                               [lecture_id, student_id, student_name, group_number, section_number, 'Registration failed'], () => {});
                        return res.status(500).json({ success: false, message: 'Failed to register attendance' });
                    }
                    console.log('Attendance registered successfully for student:', student_id);
                    res.json({ success: true, message: 'Attendance registered successfully' });
                });
            });
        });
    });
});

// Get attendance statistics for a lecture
app.get('/api/admin/attendance/:lectureId', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { lectureId } = req.params;
    
    db.get(`SELECT l.*, s.name as subject_name, s.admin_id 
            FROM lectures l 
            JOIN subjects s ON l.subject_id = s.id 
            WHERE l.id = ? AND s.admin_id = ?`, [lectureId, req.session.adminId], (err, lecture) => {
        if (err || !lecture) {
            return res.status(404).json({ success: false, message: 'Lecture not found' });
        }
        
        db.all(`SELECT * FROM attendance WHERE lecture_id = ?`, [lectureId], (err, attendance) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
            }
            
            db.all(`SELECT * FROM failed_attempts WHERE lecture_id = ?`, [lectureId], (err, failedAttempts) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Failed to fetch failed attempts' });
                }
                
                res.json({
                    success: true,
                    lecture,
                    attendance,
                    failedAttempts,
                    stats: {
                        totalAttended: attendance.length,
                        totalFailedAttempts: failedAttempts.length
                    }
                });
            });
        });
    });
});

// Export attendance to Excel (Successful attempts only)
app.get('/api/admin/export/:lectureId', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { lectureId } = req.params;
    const userRole = req.session.adminRole || 'doctor';
    
    // Check access
    let accessQuery, accessParams;
    if (userRole === 'super_admin') {
        accessQuery = `SELECT l.*, s.name as subject_name, s.admin_id 
                      FROM lectures l 
                      JOIN subjects s ON l.subject_id = s.id 
                      WHERE l.id = ?`;
        accessParams = [lectureId];
    } else {
        accessQuery = `SELECT l.*, s.name as subject_name, s.admin_id 
                      FROM lectures l 
                      JOIN subjects s ON l.subject_id = s.id 
                      WHERE l.id = ? AND (s.admin_id = ? OR l.created_by = ?)`;
        accessParams = [lectureId, req.session.adminId, req.session.adminId];
    }
    
    db.get(accessQuery, accessParams, (err, lecture) => {
        if (err || !lecture) {
            console.error('Error accessing lecture for export:', err);
            return res.status(404).json({ success: false, message: 'Lecture not found or access denied' });
        }
        
        // Get only successful attendance records (from attendance table, not failed_attempts)
        db.all(`SELECT * FROM attendance WHERE lecture_id = ? ORDER BY group_number, section_number, student_name`, [lectureId], (err, attendance) => {
            if (err) {
                console.error('Error fetching attendance:', err);
                return res.status(500).json({ success: false, message: 'Failed to fetch attendance data' });
            }
            
            // Create Excel workbook
            const workbook = XLSX.utils.book_new();
            
            // Create separate sheets for each group
            const groupedData = {};
            
            attendance.forEach(record => {
                const group = record.group_number || 'غير محدد';
                if (!groupedData[group]) {
                    groupedData[group] = [];
                }
                groupedData[group].push({
                    'الرقم الجامعي': record.student_id,
                    'اسم الطالب': record.student_name,
                    'الجروب': record.group_number || 'غير محدد',
                    'السكشن': record.section_number || 'غير محدد',
                    'وقت الحضور': new Date(record.timestamp).toLocaleString('ar-EG')
                });
            });
            
            // Create a sheet for each group
            Object.entries(groupedData).forEach(([groupNumber, records]) => {
                const worksheet = XLSX.utils.json_to_sheet(records);
                const sheetName = `Group ${groupNumber}`.substring(0, 31); // Excel sheet name limit
                XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            });
            
            // Also create a summary sheet with all attendance
            const allData = attendance.map(record => ({
                'الرقم الجامعي': record.student_id,
                'اسم الطالب': record.student_name,
                'الجروب': record.group_number || 'غير محدد',
                'السكشن': record.section_number || 'غير محدد',
                'وقت الحضور': new Date(record.timestamp).toLocaleString('ar-EG')
            }));
            
            const allWorksheet = XLSX.utils.json_to_sheet(allData);
            XLSX.utils.book_append_sheet(workbook, allWorksheet, 'All Attendance');
            
            // Generate Excel file with new naming format: SubjectName - LectureTitle - Group
            // Remove special characters for file name
            const cleanSubjectName = lecture.subject_name.replace(/[\/\\?%*:|"<>]/g, '-');
            const cleanTitle = lecture.title.replace(/[\/\\?%*:|"<>]/g, '-');
            
            // Get unique groups for filename
            const uniqueGroups = [...new Set(attendance.map(r => r.group_number || 'غير محدد'))];
            const groupsText = uniqueGroups.length === 1 ? uniqueGroups[0] : `Groups ${uniqueGroups.length}`;
            
            const fileName = `${cleanSubjectName} - ${cleanTitle} - ${groupsText}.xlsx`;
            const filePath = path.join(__dirname, 'exports', fileName);
            
            // Create exports directory if it doesn't exist
            if (!fs.existsSync('exports')) {
                fs.mkdirSync('exports', { recursive: true });
            }
            
            XLSX.writeFile(workbook, filePath);
            
            res.download(filePath, fileName, (err) => {
                if (err) {
                    console.error('Download error:', err);
                }
                // Clean up the file after download
                setTimeout(() => {
                    try {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    } catch (cleanupErr) {
                        console.error('Error cleaning up file:', cleanupErr);
                    }
                }, 5000);
            });
        });
    });
});

// Toggle lecture status (active/inactive)
app.post('/api/admin/lectures/:lectureId/toggle', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { lectureId } = req.params;
    const { isActive } = req.body;
    
    console.log('Toggling lecture status:', { lectureId, isActive });
    
    db.get(`SELECT l.*, s.admin_id 
            FROM lectures l 
            JOIN subjects s ON l.subject_id = s.id 
            WHERE l.id = ? AND s.admin_id = ?`, [lectureId, req.session.adminId], (err, lecture) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!lecture) {
            return res.status(404).json({ success: false, message: 'Lecture not found' });
        }
        
        db.run("UPDATE lectures SET is_active = ? WHERE id = ?", [isActive ? 1 : 0, lectureId], function(err) {
            if (err) {
                console.error('Update error:', err);
                return res.status(500).json({ success: false, message: 'Failed to update lecture status' });
            }
            
            console.log('Lecture status updated successfully');
            res.json({ success: true, message: 'Lecture status updated' });
        });
    });
});

// Delete lecture
app.delete('/api/admin/lectures/:lectureId', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { lectureId } = req.params;
    
    // Check access based on role
    let accessQuery, accessParams;
    if (req.session.adminRole === 'super_admin') {
        accessQuery = `SELECT l.*, s.name as subject_name FROM lectures l JOIN subjects s ON l.subject_id = s.id WHERE l.id = ?`;
        accessParams = [lectureId];
    } else {
        accessQuery = `SELECT l.*, s.name as subject_name FROM lectures l 
                      JOIN subjects s ON l.subject_id = s.id 
                      JOIN doctor_subjects ds ON s.id = ds.subject_id
                      WHERE l.id = ? AND ds.doctor_id = ?`;
        accessParams = [lectureId, req.session.adminId];
    }
    
    db.get(accessQuery, accessParams, (err, lecture) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!lecture) {
            return res.status(404).json({ success: false, message: 'Lecture not found or no access' });
        }
        
        // Delete lecture (cascade to attendance and failed_attempts)
        db.run("DELETE FROM lectures WHERE id = ?", [lectureId], function(err) {
            if (err) {
                console.error('Error deleting lecture:', err);
                return res.status(500).json({ success: false, message: 'Failed to delete lecture' });
            }
            
            res.json({ success: true, message: 'Lecture deleted successfully' });
        });
    });
});

// Update lecture QR/attendance/lecture status
app.put('/api/admin/lectures/:lectureId/status', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { lectureId } = req.params;
    const { attendance_finished, lecture_finished } = req.body;
    
    // Check access
    let accessQuery, accessParams;
    if (req.session.adminRole === 'super_admin') {
        accessQuery = `SELECT l.* FROM lectures l WHERE l.id = ?`;
        accessParams = [lectureId];
    } else {
        accessQuery = `SELECT l.* FROM lectures l 
                      JOIN subjects s ON l.subject_id = s.id 
                      JOIN doctor_subjects ds ON s.id = ds.subject_id
                      WHERE l.id = ? AND ds.doctor_id = ?`;
        accessParams = [lectureId, req.session.adminId];
    }
    
    db.get(accessQuery, accessParams, (err, lecture) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!lecture) {
            return res.status(404).json({ success: false, message: 'Lecture not found or no access' });
        }
        
        const updates = [];
        const params = [];
        
        if (attendance_finished !== undefined) {
            updates.push('attendance_finished = ?');
            params.push(attendance_finished ? 1 : 0);
        }
        if (lecture_finished !== undefined) {
            updates.push('lecture_finished = ?');
            params.push(lecture_finished ? 1 : 0);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid updates provided' });
        }
        
        params.push(lectureId);
        
        const query = `UPDATE lectures SET ${updates.join(', ')} WHERE id = ?`;
        
        db.run(query, params, function(err) {
            if (err) {
                console.error('Error updating lecture status:', err);
                return res.status(500).json({ success: false, message: 'Failed to update lecture status' });
            }
            
            res.json({ success: true, message: 'Lecture status updated successfully' });
        });
    });
});

// Refresh lecture QR code
app.post('/api/admin/lectures/:lectureId/refresh-qr', requireRole(['doctor', 'super_admin']), async (req, res) => {
    const { lectureId } = req.params;
    const newQrCode = uuidv4();

    db.get('SELECT qr_refresh_interval FROM lectures WHERE id = ?', [lectureId], (err, lecture) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!lecture) {
            return res.status(404).json({ success: false, message: 'Lecture not found' });
        }

        const refreshInterval = lecture.qr_refresh_interval;
        if (!refreshInterval || refreshInterval <= 0) {
            return res.status(400).json({ success: false, message: 'QR code refresh is not enabled for this lecture' });
        }

        const expiresAt = new Date(Date.now() + refreshInterval * 1000).toISOString();

        db.run('UPDATE lectures SET qr_code = ?, qr_code_expires_at = ? WHERE id = ?', [newQrCode, expiresAt, lectureId], function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Failed to refresh QR code' });
            }
            res.json({ success: true, qrCode: newQrCode, expiresAt: expiresAt });
        });
    });
});

// Update lecture QR refresh interval
app.put('/api/admin/lectures/:lectureId/qr-interval', requireRole(['doctor', 'super_admin']), (req, res) => {
    const { lectureId } = req.params;
    const { qr_refresh_interval } = req.body;

    const refreshInterval = qr_refresh_interval ? parseInt(qr_refresh_interval, 10) : 0;

    db.run('UPDATE lectures SET qr_refresh_interval = ? WHERE id = ?', [refreshInterval, lectureId], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to update QR refresh interval' });
        }
        res.json({ success: true, message: 'QR refresh interval updated successfully' });
    });
});

// Get doctor's subjects for lecture creation
app.get('/api/admin/doctor-subjects', (req, res) => {
    console.log('Doctor subjects API accessed by:', req.session.adminId, 'role:', req.session.adminRole);
    
    if (!req.session.adminId) {
        console.log('No session adminId found');
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    // Check if user is doctor by looking in database
    db.get('SELECT role FROM admins WHERE id = ?', [req.session.adminId], (err, admin) => {
        if (err || !admin) {
            return res.status(401).json({ success: false, message: 'Admin not found' });
        }
        
        if (admin.role !== 'doctor') {
            return res.status(403).json({ success: false, message: 'Access denied: Doctor role required' });
        }
        
        // First check if doctor has any subjects assigned
        db.all('SELECT * FROM doctor_subjects WHERE doctor_id = ?', [req.session.adminId], (err, doctorSubjectMappings) => {
            if (err) {
                console.error('Error checking doctor subject mappings:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            console.log(`Doctor ${req.session.adminId} has ${doctorSubjectMappings.length} subject mappings:`, doctorSubjectMappings);
            
            if (doctorSubjectMappings.length === 0) {
                console.log('No subject mappings found for doctor, trying fallback with assigned_subject_id');
                // Fallback: try to get subject from assigned_subject_id column
                db.get('SELECT assigned_subject_id FROM admins WHERE id = ?', [req.session.adminId], (err, admin) => {
                    if (err) {
                        console.error('Error getting assigned_subject_id:', err);
                        return res.json({ success: true, subjects: [] });
                    }
                    
                    if (admin && admin.assigned_subject_id) {
                        // Get the assigned subject
                        db.get('SELECT * FROM subjects WHERE id = ? AND is_active = 1', [admin.assigned_subject_id], (err, subject) => {
                            if (err || !subject) {
                                console.log('Assigned subject not found or inactive');
                                return res.json({ success: true, subjects: [] });
                            }
                            
                            console.log('Found assigned subject via fallback:', subject.name);
                            res.json({ success: true, subjects: [subject] });
                        });
                    } else {
                        console.log('No assigned_subject_id found either');
                        res.json({ success: true, subjects: [] });
                    }
                });
                return;
            }
            
            // Now fetch the actual subjects
            db.all(`SELECT s.* FROM subjects s 
                    JOIN doctor_subjects ds ON s.id = ds.subject_id 
                    WHERE ds.doctor_id = ? AND s.is_active = 1 
                    ORDER BY s.name`, [req.session.adminId], (err, subjects) => {
                if (err) {
                    console.error('Error fetching doctor subjects:', err);
                    return res.status(500).json({ success: false, message: 'Failed to fetch subjects' });
                }
                
                console.log(`Found ${subjects.length} active subjects for doctor ${req.session.adminId}`);
                res.json({ success: true, subjects });
            });
        });
    });
});

// Get doctor statistics for specific doctor
app.get('/api/admin/statistics/doctor/:doctorId', requireRole(['super_admin']), (req, res) => {
    const { doctorId } = req.params;
    
    console.log('Fetching statistics for doctor:', doctorId);
    
    // Get doctor info first
    db.get(`SELECT full_name, username FROM admins WHERE id = ?`, [doctorId], (err, doctor) => {
        if (err || !doctor) {
            console.error('Error fetching doctor:', err);
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }
        
        // Get lectures CREATED BY this doctor only
        db.all(`SELECT 
                    l.id as lecture_id,
                    l.title,
                    l.date,
                    l.start_time,
                    l.end_time,
                    s.name as subject_name,
                    COUNT(att.id) as attendance_count
                FROM lectures l
                JOIN subjects s ON l.subject_id = s.id
                LEFT JOIN attendance att ON att.lecture_id = l.id
                WHERE l.created_by = ?
                GROUP BY l.id
                ORDER BY l.date DESC`, [doctorId], (err, results) => {
            if (err) {
                console.error('Error fetching doctor lectures:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            console.log(`Found ${results.length} lectures for doctor ${doctorId}`);
            
            res.json({ 
                success: true, 
                doctor: {
                    id: doctorId,
                    name: doctor.full_name,
                    username: doctor.username
                },
                data: results 
            });
        });
    });
});

// Enhanced Statistics APIs
// Get detailed statistics for a lecture (role-based)
app.get('/api/admin/statistics/lecture/:lectureId', (req, res) => {
    console.log('=== LECTURE STATS API CALL ===');
    console.log('Session:', req.session);
    console.log('Params:', req.params);
    
    if (!req.session.adminId) {
        console.log('No adminId in session');
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { lectureId } = req.params;
    const userRole = req.session.adminRole || 'doctor'; // Default to doctor if not set
    
    console.log('Lecture statistics API accessed by:', req.session.adminId, 'role:', userRole, 'lectureId:', lectureId);
    
    // First, get the lecture and verify access
    let accessQuery, accessParams;
    
    if (userRole === 'super_admin') {
        accessQuery = `SELECT l.*, s.name as subject_name, s.admin_id FROM lectures l 
                      JOIN subjects s ON l.subject_id = s.id WHERE l.id = ?`;
        accessParams = [lectureId];
    } else {
        // For doctors, try doctor_subjects table first
        accessQuery = `SELECT l.*, s.name as subject_name, s.admin_id FROM lectures l 
                      JOIN subjects s ON l.subject_id = s.id 
                      JOIN doctor_subjects ds ON s.id = ds.subject_id
                      WHERE l.id = ? AND ds.doctor_id = ?`;
        accessParams = [lectureId, req.session.adminId];
    }
    
    db.get(accessQuery, accessParams, (err, lecture) => {
        if (err) {
            console.error('Error checking lecture access:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        // If no access found and user is doctor, try fallback
        if (!lecture && userRole !== 'super_admin') {
            console.log('No access in doctor_subjects, trying fallback with assigned_subject_id');
            const fallbackQuery = `SELECT l.*, s.name as subject_name, s.admin_id FROM lectures l 
                                 JOIN subjects s ON l.subject_id = s.id 
                                 WHERE l.id = ? AND s.id IN (SELECT assigned_subject_id FROM admins WHERE id = ?)`;
            
            db.get(fallbackQuery, [lectureId, req.session.adminId], (err, fallbackLecture) => {
                if (err) {
                    console.error('Fallback query error:', err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }
                
                if (!fallbackLecture) {
                    console.log('No access to lecture:', lectureId);
                    return res.status(404).json({ success: false, message: 'Lecture not found or no access' });
                }
                
                try {
                    fetchLectureStatistics(fallbackLecture);
                } catch (error) {
                    console.error('Error in fetchLectureStatistics (fallback):', error);
                    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
                }
            });
            return;
        }
        
        if (!lecture) {
            console.log('Lecture not found:', lectureId);
            return res.status(404).json({ success: false, message: 'Lecture not found or no access' });
        }
        
        try {
            fetchLectureStatistics(lecture);
        } catch (error) {
            console.error('Error in fetchLectureStatistics:', error);
            res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
        }
    });
    
    function fetchLectureStatistics(lecture) {
        console.log('Fetching statistics for lecture:', lecture.id, lecture.title);
        
        // Helper function to return final response
        function returnFinalResponse(statsData, attendanceData, failedAttemptsData = []) {
            console.log('Returning statistics:', {
                lecture: lecture.title,
                total_attendance: statsData[0]?.total_attendance,
                attendance_records: attendanceData?.length,
                failed_attempts: failedAttemptsData?.length
            });
            
            res.json({ 
                success: true, 
                lecture,
                statistics: statsData[0] || {},
                attendance: attendanceData || [],
                failedAttempts: failedAttemptsData || []
            });
        }
        
        // Get attendance statistics
        db.all(`SELECT 
                    COUNT(*) as total_attendance,
                    COUNT(DISTINCT DATE(timestamp)) as attendance_days,
                    MIN(timestamp) as first_attendance,
                    MAX(timestamp) as last_attendance
                FROM attendance WHERE lecture_id = ?`, [lectureId], (err, stats) => {
            if (err) {
                console.error('Error fetching attendance stats:', err);
                return res.status(500).json({ success: false, message: 'Statistics error: ' + err.message });
            }
            
            // Get attendance records
            db.all(`SELECT student_id, student_name, group_number, section_number, timestamp 
                    FROM attendance WHERE lecture_id = ? ORDER BY timestamp`, [lectureId], (err, attendanceRecords) => {
                if (err) {
                    console.error('Error fetching attendance records:', err);
                    return res.status(500).json({ success: false, message: 'Attendance records error: ' + err.message });
                }
                
                // Try to get failed attempts, but don't fail if it doesn't work
                console.log('Attempting to fetch failed attempts for lecture:', lectureId);
                
                try {
                    // First try with all columns including new ones
                    db.all(`SELECT id, student_id, student_name, group_number, section_number, reason, timestamp 
                            FROM failed_attempts WHERE lecture_id = ?`, [lectureId], (err, failedAttempts) => {
                    if (err) {
                        console.error('Error fetching failed attempts with all columns:', err);
                        
                        // If column doesn't exist, try without new columns
                        if (err.message.includes('no such column')) {
                            console.log('Retrying without student_name/group_number/section_number columns');
                            db.all(`SELECT id, student_id, reason, timestamp FROM failed_attempts WHERE lecture_id = ?`, [lectureId], (err2, failedAttempts2) => {
                                if (err2) {
                                    console.error('Second attempt also failed, continuing without failed attempts:', err2);
                                } else {
                                    console.log('Successfully fetched failed attempts without extra columns');
                                }
                                returnFinalResponse(stats, attendanceRecords, err2 ? [] : failedAttempts2);
                            });
                            return;
                        }
                        
                        // For other errors, just continue without failed attempts
                        console.log('Continuing without failed attempts data due to error');
                        returnFinalResponse(stats, attendanceRecords, []);
                        return;
                    }
                    
                    // Success case
                    returnFinalResponse(stats, attendanceRecords, failedAttempts);
                    });
                } catch (outerError) {
                    console.error('Unexpected error in failed attempts query:', outerError);
                    returnFinalResponse(stats, attendanceRecords, []);
                }
            });
        });
    }
});

// Get overall statistics for admin (Super Admin sees all)
// Daily attendance chart data
app.get('/api/admin/statistics/daily-attendance', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { days = 14 } = req.query; // Default to last 14 days
    const userRole = req.session.adminRole || 'doctor';
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    let query, params;
    
    if (userRole === 'super_admin') {
        // Get all attendance data grouped by date
        query = `
            SELECT 
                DATE(l.date) as attendance_date,
                COUNT(DISTINCT a.id) as total_attendance,
                COUNT(DISTINCT l.id) as total_lectures
            FROM lectures l
            LEFT JOIN attendance a ON l.id = a.lecture_id
            WHERE DATE(l.date) BETWEEN ? AND ?
            GROUP BY DATE(l.date)
            ORDER BY DATE(l.date) ASC
        `;
        params = [startDateStr, endDateStr];
    } else {
        // Get attendance data for lectures created by this doctor
        query = `
            SELECT 
                DATE(l.date) as attendance_date,
                COUNT(DISTINCT a.id) as total_attendance,
                COUNT(DISTINCT l.id) as total_lectures
            FROM lectures l
            LEFT JOIN attendance a ON l.id = a.lecture_id
            WHERE l.created_by = ? AND DATE(l.date) BETWEEN ? AND ?
            GROUP BY DATE(l.date)
            ORDER BY DATE(l.date) ASC
        `;
        params = [req.session.adminId, startDateStr, endDateStr];
    }
    
    db.all(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching daily attendance:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        // Fill in missing dates with zero values
        const dateMap = {};
        results.forEach(row => {
            dateMap[row.attendance_date] = {
                attendance: row.total_attendance,
                lectures: row.total_lectures
            };
        });
        
        // Generate all dates in range
        const dailyData = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            dailyData.push({
                date: dateStr,
                attendance: dateMap[dateStr]?.attendance || 0,
                lectures: dateMap[dateStr]?.lectures || 0
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        res.json({
            success: true,
            data: dailyData,
            period: {
                start: startDateStr,
                end: endDateStr,
                days: parseInt(days)
            }
        });
    });
});

app.get('/api/admin/statistics/overview', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    if (req.session.adminRole === 'super_admin') {
        // Super admin overview - all statistics (simplified)
        const getSuperAdminStats = () => {
            let completed = 0;
            let statsData = {
                total_doctors: 0,
                total_subjects: 0,
                total_lectures: 0,
                lectures_with_attendance: 0,
                total_attendance_records: 0
            };
            let doctorStats = [];
            
            const checkComplete = () => {
                completed++;
                if (completed === 6) { // 5 counts + 1 doctor stats
                    res.json({ 
                        success: true, 
                        overview: statsData,
                        doctorStatistics: doctorStats
                    });
                }
            };
            
            // Count doctors
            db.get(`SELECT COUNT(*) as count FROM admins WHERE role = 'doctor'`, (err, result) => {
                if (!err && result) {
                    statsData.total_doctors = result.count;
                }
                checkComplete();
            });
            
            // Count subjects
            db.get(`SELECT COUNT(*) as count FROM subjects`, (err, result) => {
                if (!err && result) {
                    statsData.total_subjects = result.count;
                }
                checkComplete();
            });
            
            // Count lectures
            db.get(`SELECT COUNT(*) as count FROM lectures`, (err, result) => {
                if (!err && result) {
                    statsData.total_lectures = result.count;
                }
                checkComplete();
            });
            
            // Count attendance records
            db.get(`SELECT COUNT(*) as count FROM attendance`, (err, result) => {
                if (!err && result) {
                    statsData.total_attendance_records = result.count;
                }
                checkComplete();
            });
            
            // Count lectures with attendance
            db.get(`SELECT COUNT(DISTINCT lecture_id) as count FROM attendance`, (err, result) => {
                if (!err && result) {
                    statsData.lectures_with_attendance = result.count;
                }
                checkComplete();
            });
            
            // Get doctor statistics (simplified)
            db.all(`SELECT a.full_name, a.username, a.id as doctor_id FROM admins a WHERE a.role = 'doctor'`, (err, doctors) => {
                if (!err && doctors) {
                    doctorStats = doctors.map(doctor => ({
                        full_name: doctor.full_name || 'غير محدد',
                        username: doctor.username,
                        subject_name: 'غير مخصص',
                        total_lectures: 0,
                        total_attendance: 0
                    }));
                }
                checkComplete();
            });
        };
        
        getSuperAdminStats();
    } else {
        // Doctor overview - their subjects only
        // Get basic counts separately to avoid complex joins
        const getStats = () => {
            let completed = 0;
            let statsData = {
                total_subjects: 0,
                total_lectures: 0,
                lectures_with_attendance: 0,
                total_attendance_records: 0
            };
            
            const checkComplete = () => {
                completed++;
                if (completed === 4) {
                    res.json({ 
                        success: true, 
                        overview: statsData
                    });
                }
            };
            
            // Count subjects (from doctor_subjects table + fallback to assigned_subject_id)
            db.get(`SELECT COUNT(DISTINCT s.id) as count FROM subjects s 
                   WHERE s.id IN (SELECT subject_id FROM doctor_subjects WHERE doctor_id = ?) 
                   OR s.id IN (SELECT assigned_subject_id FROM admins WHERE id = ?)`, 
                   [req.session.adminId, req.session.adminId], (err, result) => {
                if (!err && result) {
                    statsData.total_subjects = result.count;
                    console.log('Doctor subjects count:', result.count);
                }
                checkComplete();
            });
            
            // Count lectures CREATED BY this doctor
            db.get(`SELECT COUNT(*) as count FROM lectures l 
                   WHERE l.created_by = ?`, 
                   [req.session.adminId], (err, result) => {
                if (!err && result) {
                    statsData.total_lectures = result.count;
                    console.log('Doctor lectures count:', result.count);
                }
                checkComplete();
            });
            
            // Count attendance records for lectures CREATED BY this doctor
            db.get(`SELECT COUNT(*) as count FROM attendance att 
                   JOIN lectures l ON att.lecture_id = l.id 
                   WHERE l.created_by = ?`, 
                   [req.session.adminId], (err, result) => {
                if (!err && result) {
                    statsData.total_attendance_records = result.count;
                    console.log('Doctor attendance count:', result.count);
                }
                checkComplete();
            });
            
            // Count lectures with attendance CREATED BY this doctor
            db.get(`SELECT COUNT(DISTINCT att.lecture_id) as count FROM attendance att 
                   JOIN lectures l ON att.lecture_id = l.id 
                   WHERE l.created_by = ?`, 
                   [req.session.adminId], (err, result) => {
                if (!err && result) {
                    statsData.lectures_with_attendance = result.count;
                    console.log('Doctor lectures with attendance:', result.count);
                }
                checkComplete();
            });
        };
        
        getStats();
    }
});

// Advanced Statistics APIs

// Get statistics for all doctors (Super Admin only)
app.get('/api/admin/statistics/doctors', requireRole(['super_admin']), (req, res) => {
    console.log('Fetching doctors statistics for Super Admin');
    
    // Get all doctors with their subjects and lectures THEY created
    db.all(`
        SELECT 
            a.id,
            a.full_name,
            a.username,
            GROUP_CONCAT(DISTINCT s.name) as subject_names,
            COUNT(DISTINCT l.id) as total_lectures,
            COUNT(DISTINCT CASE WHEN att.lecture_id IS NOT NULL THEN l.id END) as lectures_with_attendance,
            COUNT(att.id) as total_attendance_records
        FROM admins a
        LEFT JOIN doctor_subjects ds ON a.id = ds.doctor_id
        LEFT JOIN subjects s ON ds.subject_id = s.id OR s.id IN (SELECT assigned_subject_id FROM admins WHERE id = a.id)
        LEFT JOIN lectures l ON l.subject_id = s.id AND l.created_by = a.id
        LEFT JOIN attendance att ON att.lecture_id = l.id
        WHERE a.role = 'doctor' AND a.is_active = 1
        GROUP BY a.id, a.full_name, a.username
        ORDER BY a.full_name
    `, (err, results) => {
        if (err) {
            console.error('Error fetching doctor statistics:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        console.log(`Found ${results.length} doctors with statistics`);
        
        res.json({ success: true, data: results });
    });
});

// Get statistics for all subjects (Super Admin only)
app.get('/api/admin/statistics/subjects', requireRole(['super_admin']), (req, res) => {
    db.all(`
        SELECT 
            s.id,
            s.name,
            s.code,
            GROUP_CONCAT(DISTINCT a.full_name) as doctor_name,
            COUNT(DISTINCT l.id) as total_lectures,
            COUNT(DISTINCT CASE WHEN att.lecture_id IS NOT NULL THEN l.id END) as lectures_with_attendance,
            COUNT(att.id) as total_attendance_records
        FROM subjects s
        LEFT JOIN doctor_subjects ds ON s.id = ds.subject_id
        LEFT JOIN admins a ON ds.doctor_id = a.id
        LEFT JOIN lectures l ON l.subject_id = s.id
        LEFT JOIN attendance att ON att.lecture_id = l.id
        GROUP BY s.id, s.name, s.code
        ORDER BY s.name
    `, (err, results) => {
        if (err) {
            console.error('Error fetching subject statistics:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        res.json({ success: true, data: results });
    });
});

// Get daily statistics
app.get('/api/admin/statistics/daily/:date', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { date } = req.params;
    
    let baseQuery = `
        SELECT 
            COUNT(DISTINCT l.id) as total_lectures,
            COUNT(att.id) as total_attendance
        FROM lectures l
        LEFT JOIN attendance att ON att.lecture_id = l.id
        WHERE DATE(l.date) = ?
    `;
    
    let params = [date];
    
    if (req.session.adminRole !== 'super_admin') {
        // Doctor can only see their own created lectures
        baseQuery += ` AND l.created_by = ?`;
        params.push(req.session.adminId);
    }
    
    db.get(baseQuery, params, (err, result) => {
        if (err) {
            console.error('Error fetching daily statistics:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        res.json({ success: true, data: result });
    });
});

// Get weekly statistics
app.get('/api/admin/statistics/weekly/:startDate', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { startDate } = req.params;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    
    let baseQuery = `
        SELECT 
            COUNT(DISTINCT l.id) as total_lectures,
            COUNT(att.id) as total_attendance
        FROM lectures l
        LEFT JOIN attendance att ON att.lecture_id = l.id
        WHERE DATE(l.date) >= ? AND DATE(l.date) < ?
    `;
    
    let params = [startDate, endDate.toISOString().split('T')[0]];
    
    if (req.session.adminRole !== 'super_admin') {
        // Doctor can only see their own created lectures
        baseQuery += ` AND l.created_by = ?`;
        params.push(req.session.adminId);
    }
    
    db.get(baseQuery, params, (err, result) => {
        if (err) {
            console.error('Error fetching weekly statistics:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        res.json({ success: true, data: result });
    });
});

// Get monthly statistics
app.get('/api/admin/statistics/monthly/:year/:month', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { year, month } = req.params;
    
    let baseQuery = `
        SELECT 
            COUNT(DISTINCT l.id) as total_lectures,
            COUNT(att.id) as total_attendance
        FROM lectures l
        LEFT JOIN attendance att ON att.lecture_id = l.id
        WHERE strftime('%Y', l.date) = ? AND strftime('%m', l.date) = ?
    `;
    
    let params = [year, month.padStart(2, '0')];
    
    if (req.session.adminRole !== 'super_admin') {
        // Doctor can only see their own created lectures
        baseQuery += ` AND l.created_by = ?`;
        params.push(req.session.adminId);
    }
    
    db.get(baseQuery, params, (err, result) => {
        if (err) {
            console.error('Error fetching monthly statistics:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        res.json({ success: true, data: result });
    });
});

// Create Super Admin (Super Admin only)
app.post('/api/admin/super-admin/create', requireRole(['super_admin']), (req, res) => {
    const { username, password, full_name, email } = req.body;
    
    if (!username || !password || !full_name) {
        return res.status(400).json({ success: false, message: 'Username, password, and full name are required' });
    }
    
    // Check if username already exists
    db.get("SELECT id FROM admins WHERE username = ?", [username], (err, existing) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (existing) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }
        
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        db.run(`
            INSERT INTO admins (username, password, full_name, email, role, is_active, created_by) 
            VALUES (?, ?, ?, ?, 'super_admin', 1, ?)
        `, [username, hashedPassword, full_name, email || null, req.session.adminId], function(err) {
            if (err) {
                console.error('Error creating super admin:', err);
                return res.status(500).json({ success: false, message: 'Failed to create super admin' });
            }
            
            res.json({ success: true, message: 'Super admin created successfully', adminId: this.lastID });
        });
    });
});

// Get doctor profile information
app.get('/api/admin/profile', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    db.get(`
        SELECT a.*, s.name as subject_name, s.code as subject_code, s.description as subject_description
        FROM admins a
        LEFT JOIN subjects s ON a.assigned_subject_id = s.id
        WHERE a.id = ?
    `, [req.session.adminId], (err, profile) => {
        if (err) {
            console.error('Error fetching profile:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        
        // Remove password from response
        delete profile.password;
        
        res.json({ success: true, profile });
    });
});

// Update doctor profile
app.put('/api/admin/profile', (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { full_name, email, old_password, new_password } = req.body;
    
    if (!full_name) {
        return res.status(400).json({ success: false, message: 'Full name is required' });
    }
    
    // First get current admin data
    db.get("SELECT password FROM admins WHERE id = ?", [req.session.adminId], (err, admin) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        
        let updateQuery, updateParams;
        
        if (new_password && new_password.trim()) {
            // Password change requested
            if (!old_password) {
                return res.status(400).json({ success: false, message: 'Old password is required for password change' });
            }
            
            if (!bcrypt.compareSync(old_password, admin.password)) {
                return res.status(400).json({ success: false, message: 'Current password is incorrect' });
            }
            
            const hashedNewPassword = bcrypt.hashSync(new_password, 10);
            updateQuery = "UPDATE admins SET full_name = ?, email = ?, password = ? WHERE id = ?";
            updateParams = [full_name, email || null, hashedNewPassword, req.session.adminId];
        } else {
            // No password change
            updateQuery = "UPDATE admins SET full_name = ?, email = ? WHERE id = ?";
            updateParams = [full_name, email || null, req.session.adminId];
        }
        
        db.run(updateQuery, updateParams, function(err) {
            if (err) {
                console.error('Error updating profile:', err);
                return res.status(500).json({ success: false, message: 'Failed to update profile' });
            }
            
            res.json({ success: true, message: 'Profile updated successfully' });
        });
    });
});

// ==================== Student Management Endpoints ====================

// Get student by ID
app.get('/api/student/:studentId', (req, res) => {
    const { studentId } = req.params;
    
    db.get("SELECT * FROM students WHERE student_id = ?", [studentId], (err, student) => {
        if (err) {
            console.error('Error fetching student:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!student) {
            return res.json({ success: false, message: 'Student not found' });
        }
        
        res.json({ success: true, student });
    });
});

// Save or update student data
app.post('/api/student/save', (req, res) => {
    const { student_id, student_name, group_number, section_number } = req.body;
    
    if (!student_id || !student_name) {
        return res.status(400).json({ success: false, message: 'Student ID and name are required' });
    }
    
    // Check if student data entry is enabled
    db.get("SELECT setting_value FROM settings WHERE setting_key = ?", ['student_data_entry_enabled'], (err, setting) => {
        if (err) {
            console.error('Error checking settings:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        const entryEnabled = setting && setting.setting_value === '1';
        
        if (!entryEnabled) {
            return res.status(403).json({ success: false, message: 'Student data entry is disabled' });
        }
        
        // Check if student already exists
        db.get("SELECT * FROM students WHERE student_id = ?", [student_id], (err, existing) => {
            if (err) {
                console.error('Error checking existing student:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            if (existing) {
                // Update existing student (check if edit is enabled)
                db.get("SELECT setting_value FROM settings WHERE setting_key = ?", ['student_data_edit_enabled'], (err, editSetting) => {
                    if (err) {
                        console.error('Error checking edit settings:', err);
                        return res.status(500).json({ success: false, message: 'Database error' });
                    }
                    
                    const editEnabled = editSetting && editSetting.setting_value === '1';
                    
                    if (!editEnabled) {
                        return res.status(403).json({ success: false, message: 'Student data editing is disabled' });
                    }
                    
                    // Update student
                    db.run(
                        "UPDATE students SET student_name = ?, group_number = ?, section_number = ? WHERE student_id = ?",
                        [student_name, group_number || null, section_number || null, student_id],
                        function(err) {
                            if (err) {
                                console.error('Error updating student:', err);
                                return res.status(500).json({ success: false, message: 'Failed to update student' });
                            }
                            
                            db.get("SELECT * FROM students WHERE student_id = ?", [student_id], (err, updated) => {
                                if (err) {
                                    return res.status(500).json({ success: false, message: 'Database error' });
                                }
                                res.json({ success: true, student: updated, message: 'Student updated successfully' });
                            });
                        }
                    );
                });
            } else {
                // Insert new student
                db.run(
                    "INSERT INTO students (student_id, student_name, group_number, section_number) VALUES (?, ?, ?, ?)",
                    [student_id, student_name, group_number || null, section_number || null],
                    function(err) {
                        if (err) {
                            console.error('Error inserting student:', err);
                            return res.status(500).json({ success: false, message: 'Failed to save student' });
                        }
                        
                        db.get("SELECT * FROM students WHERE student_id = ?", [student_id], (err, newStudent) => {
                            if (err) {
                                return res.status(500).json({ success: false, message: 'Database error' });
                            }
                            res.json({ success: true, student: newStudent, message: 'Student saved successfully' });
                        });
                    }
                );
            }
        });
    });
});

// ==================== Settings Endpoints ====================

// Get all settings
app.get('/api/settings', (req, res) => {
    db.all("SELECT setting_key, setting_value, description FROM settings", [], (err, rows) => {
        if (err) {
            console.error('Error fetching settings:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        
        res.json({ success: true, settings });
    });
});

// ==================== Admin Students Management ====================

// Get all students (with search and pagination)
app.get('/api/admin/students', requireRole(['super_admin', 'doctor']), (req, res) => {
    const search = req.query.search || '';
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    let query, countQuery, queryParams, countParams;
    
    if (search && search.trim()) {
        const searchPattern = `%${search}%`;
        query = `SELECT * FROM students 
                 WHERE student_id LIKE ? OR student_name LIKE ? OR group_number LIKE ? OR section_number LIKE ?
                 ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        countQuery = `SELECT COUNT(*) as total FROM students 
                      WHERE student_id LIKE ? OR student_name LIKE ? OR group_number LIKE ? OR section_number LIKE ?`;
        queryParams = [searchPattern, searchPattern, searchPattern, searchPattern, limit, offset];
        countParams = [searchPattern, searchPattern, searchPattern, searchPattern];
    } else {
        query = "SELECT * FROM students ORDER BY created_at DESC LIMIT ? OFFSET ?";
        countQuery = "SELECT COUNT(*) as total FROM students";
        queryParams = [limit, offset];
        countParams = [];
    }
    
    db.all(query, queryParams, (err, students) => {
        if (err) {
            console.error('Error fetching students:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        db.get(countQuery, countParams, (err, countResult) => {
            if (err) {
                console.error('Error counting students:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            const total = countResult.total;
            const totalPages = Math.ceil(total / limit);
            const currentPage = Math.floor(offset / limit) + 1;
            
            res.json({
                success: true,
                students: students || [],
                pagination: {
                    total,
                    totalPages,
                    currentPage,
                    limit,
                    offset
                }
            });
        });
    });
});

// Get single student for editing
app.get('/api/admin/students/:studentId', requireRole(['super_admin', 'doctor']), (req, res) => {
    const { studentId } = req.params;
    
    db.get("SELECT * FROM students WHERE student_id = ?", [studentId], (err, student) => {
        if (err) {
            console.error('Error fetching student:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        res.json({ success: true, student });
    });
});

// Update student
app.put('/api/admin/students/:studentId', requireRole(['super_admin', 'doctor']), (req, res) => {
    const { studentId } = req.params;
    const { student_name, group_number, section_number } = req.body;
    
    if (!student_name) {
        return res.status(400).json({ success: false, message: 'Student name is required' });
    }
    
    db.run(
        "UPDATE students SET student_name = ?, group_number = ?, section_number = ? WHERE student_id = ?",
        [student_name, group_number || null, section_number || null, studentId],
        function(err) {
            if (err) {
                console.error('Error updating student:', err);
                return res.status(500).json({ success: false, message: 'Failed to update student' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ success: false, message: 'Student not found' });
            }
            
            res.json({ success: true, message: 'Student updated successfully' });
        }
    );
});

// Delete student
app.delete('/api/admin/students/:studentId', requireRole(['super_admin', 'doctor']), (req, res) => {
    const { studentId } = req.params;
    
    db.run("DELETE FROM students WHERE student_id = ?", [studentId], function(err) {
        if (err) {
            console.error('Error deleting student:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        res.json({ success: true, message: 'Student deleted successfully' });
    });
});

// ==================== Admin Settings Management ====================

// Get all settings (admin)
app.get('/api/admin/settings', requireRole(['super_admin']), (req, res) => {
    db.all("SELECT * FROM settings ORDER BY setting_key", [], (err, settings) => {
        if (err) {
            console.error('Error fetching settings:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        res.json({ success: true, settings });
    });
});

// Update setting
app.put('/api/admin/settings', requireRole(['super_admin']), (req, res) => {
    const { setting_key, setting_value } = req.body;
    
    if (!setting_key) {
        return res.status(400).json({ success: false, message: 'Setting key is required' });
    }
    
    const value = setting_value ? '1' : '0';
    
    db.run(
        "UPDATE settings SET setting_value = ? WHERE setting_key = ?",
        [value, setting_key],
        function(err) {
            if (err) {
                console.error('Error updating setting:', err);
                return res.status(500).json({ success: false, message: 'Failed to update setting' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ success: false, message: 'Setting not found' });
            }
            
            res.json({ success: true, message: 'Setting updated successfully' });
        }
    );
});

// Serve user interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'user', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
});

module.exports = app;
