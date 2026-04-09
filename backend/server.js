const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database setup
const dbPath = path.join(__dirname, 'equipment.db');
console.log(`📁 Database path: ${dbPath}`);

// Delete existing database for fresh start (remove this line for production)
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('🗑️ Removed existing database');
}

const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
    // Equipment table
    db.run(`
        CREATE TABLE IF NOT EXISTS equipment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sticker_no TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            model_no TEXT NOT NULL,
            department TEXT NOT NULL,
            location TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            min_stock INTEGER DEFAULT 1,
            supplier TEXT,
            manufacturer TEXT,
            purchase_price TEXT,
            issue_date TEXT,
            expiry_date TEXT,
            status TEXT DEFAULT 'Operational',
            type TEXT,
            warranty_card TEXT,
            last_maintenance TEXT,
            next_maintenance TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Error creating equipment:', err.message);
        else console.log('✅ Equipment table created');
    });

    // Maintenance requests table
    db.run(`
        CREATE TABLE IF NOT EXISTS maintenance_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sticker_no TEXT NOT NULL,
            equipment_name TEXT NOT NULL,
            manufacturer TEXT,
            model_no TEXT,
            department TEXT NOT NULL,
            issue_date TEXT,
            issue_description TEXT,
            priority TEXT DEFAULT 'Medium',
            status TEXT DEFAULT 'Pending',
            requested_by TEXT,
            requested_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_date DATETIME,
            notes TEXT
        )
    `, (err) => {
        if (err) console.error('Error creating maintenance:', err.message);
        else console.log('✅ Maintenance table created');
    });

    // Transfer notifications table
    db.run(`
        CREATE TABLE IF NOT EXISTS transfer_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipment_name TEXT NOT NULL,
            sticker_no TEXT NOT NULL,
            from_department TEXT NOT NULL,
            to_department TEXT NOT NULL,
            reason TEXT,
            transferred_by TEXT,
            authorized_by TEXT,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            read_status INTEGER DEFAULT 0
        )
    `, (err) => {
        if (err) console.error('Error creating notifications:', err.message);
        else console.log('✅ Notifications table created');
    });

    // Users table for authentication
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'Staff',
            department TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Error creating users:', err.message);
        else console.log('✅ Users table created');
    });

    // Insert sample data after tables are created
    setTimeout(() => {
        db.get("SELECT COUNT(*) as count FROM equipment", (err, row) => {
            if (!err && row && row.count === 0) {
                insertSampleData();
            }
        });
        
        // Insert default users
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (!err && row && row.count === 0) {
                insertDefaultUsers();
            }
        });
    }, 500);
});

// Function to insert sample equipment
function insertSampleData() {
    const sampleEquipment = [
        ['EQ-001', 'Ventilator', 'V-1000', 'ICU', 'ICU Ward', 5, 2, 'MedTech Solutions', 'Medtronic', '2500000', '2023-01-15', '2028-01-15', 'Operational', 'Life Support', null, '2024-02-15', '2024-05-15'],
        ['EQ-002', 'ECG Machine', 'ECG-200', 'ICU', 'Cardiology', 3, 1, 'Diagnostic Systems', 'GE Healthcare', '750000', '2023-03-20', '2025-04-10', 'Operational', 'Diagnostic', null, '2024-01-10', '2024-04-10'],
        ['EQ-003', 'X-Ray Machine', 'XR-300', 'Radiology', 'X-Ray Room', 2, 1, 'Siemens Health', 'Siemens', '4500000', '2022-12-10', '2024-04-15', 'Under Maintenance', 'Imaging', null, '2024-02-20', '2024-05-20'],
        ['EQ-004', 'Patient Monitor', 'PM-600', 'ICU', 'ICU Ward', 8, 3, 'Philips', 'Philips', '120000', '2023-06-15', '2026-06-15', 'In Use', 'Monitoring', null, '2024-02-10', '2024-05-10'],
        ['EQ-005', 'OT Table', 'OT-2000', 'OT', 'Operation Theatre', 4, 2, 'Surgical Solutions', 'Steris', '3500000', '2023-08-10', '2028-08-10', 'Operational', 'Life Support', null, '2024-02-01', '2024-05-01'],
        ['EQ-006', 'Defibrillator', 'DF-500', 'ER / OPD', 'Emergency Room', 6, 2, 'Zoll Medical', 'Zoll', '320000', '2023-09-20', '2025-09-20', 'Available', 'Emergency', null, '2024-02-01', '2024-05-01'],
        ['EQ-007', 'Ultrasound', 'US-400', 'Radiology', 'Radiology', 3, 1, 'Philips Medical', 'Philips', '1850000', '2023-05-05', '2024-05-05', 'Operational', 'Imaging', null, '2024-01-25', '2024-04-25'],
        ['EQ-008', 'Eye Testing Machine', 'EYE-500', 'EYE', 'Eye Clinic', 4, 2, 'Ophthalmic Systems', 'Zeiss', '280000', '2023-07-01', '2026-07-01', 'Operational', 'Diagnostic', null, '2024-02-10', '2024-05-10'],
        ['EQ-009', 'Computer', 'Optiplex', 'IT', 'IT Office', 15, 5, 'Dell', 'Dell', '85000', '2023-01-15', '2024-04-01', 'Operational', 'IT Equipment', null, '2024-02-15', '2024-05-15'],
        ['EQ-010', 'Server', 'PowerEdge', 'IT', 'Server Room', 3, 2, 'Dell', 'Dell', '450000', '2023-03-20', '2024-04-20', 'Operational', 'IT Equipment', null, '2024-01-10', '2024-04-10']
    ];

    const insertStmt = db.prepare(`
        INSERT INTO equipment (
            sticker_no, name, model_no, department, location, quantity, min_stock,
            supplier, manufacturer, purchase_price, issue_date, expiry_date,
            status, type, warranty_card, last_maintenance, next_maintenance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    sampleEquipment.forEach(equip => {
        insertStmt.run(equip, (err) => {
            if (err && err.code !== 'SQLITE_CONSTRAINT') {
                console.error('Error inserting:', err.message);
            }
        });
    });
    
    insertStmt.finalize();
    console.log('✅ Sample equipment data inserted');
}

// Function to insert default users
function insertDefaultUsers() {
    const defaultUsers = [
        ['admin', 'admin123', 'Super Admin', 'Super Admin', 'All'],
        ['it_head', 'it123', 'IT Head', 'Department Head', 'IT'],
        ['icu_head', 'icu123', 'ICU Head', 'Department Head', 'ICU'],
        ['radiology_head', 'rad123', 'Radiology Head', 'Department Head', 'Radiology'],
        ['eye_head', 'eye123', 'EYE Head', 'Department Head', 'EYE'],
        ['ot_head', 'ot123', 'OT Head', 'Department Head', 'OT'],
        ['er_head', 'er123', 'ER Head', 'Department Head', 'ER / OPD'],
        ['pharmacy_head', 'pharma123', 'Pharmacy Head', 'Department Head', 'PHARMACY'],
        ['lab_head', 'lab123', 'Lab Head', 'Department Head', 'LAB'],
        ['accounts_head', 'acc123', 'Accounts Head', 'Department Head', 'ACCOUNTS'],
        ['hr_head', 'hr123', 'HR Head', 'Department Head', 'HR']
    ];
    
    const insertStmt = db.prepare(`
        INSERT INTO users (username, password, name, role, department)
        VALUES (?, ?, ?, ?, ?)
    `);
    
    defaultUsers.forEach(user => {
        insertStmt.run(user, (err) => {
            if (err && err.code !== 'SQLITE_CONSTRAINT') {
                console.error('Error inserting user:', err.message);
            }
        });
    });
    
    insertStmt.finalize();
    console.log('✅ Default users inserted');
}

// ============ API ROUTES ============

// Get all equipment
app.get('/api/equipment', (req, res) => {
    const { department } = req.query;
    let query = 'SELECT * FROM equipment';
    let params = [];

    if (department && department !== 'all') {
        query += ' WHERE department = ?';
        params.push(department);
    }
    query += ' ORDER BY id DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Add equipment
app.post('/api/equipment', (req, res) => {
    const {
        sticker_no, name, model_no, department, location, quantity, min_stock,
        supplier, manufacturer, purchase_price, issue_date, expiry_date,
        status, type, warranty_card
    } = req.body;

    const query = `
        INSERT INTO equipment (
            sticker_no, name, model_no, department, location, quantity, min_stock,
            supplier, manufacturer, purchase_price, issue_date, expiry_date,
            status, type, warranty_card, last_maintenance, next_maintenance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'), DATE('now', '+90 days'))
    `;

    db.run(query, [
        sticker_no, name, model_no, department, location, quantity || 1, min_stock || 1,
        supplier, manufacturer, purchase_price, issue_date, expiry_date,
        status || 'Operational', type, warranty_card
    ], function(err) {
        if (err) {
            console.error('Error adding equipment:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({ id: this.lastID, message: 'Equipment added successfully' });
    });
});

// Delete equipment
app.delete('/api/equipment/:id', (req, res) => {
    db.run('DELETE FROM equipment WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Equipment not found' });
            return;
        }
        res.json({ message: 'Equipment deleted successfully' });
    });
});

// Update equipment department (transfer)
app.put('/api/equipment/:id/transfer', (req, res) => {
    const { new_department } = req.body;
    
    db.run('UPDATE equipment SET department = ? WHERE id = ?', [new_department, req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Equipment not found' });
            return;
        }
        res.json({ message: 'Equipment transferred successfully' });
    });
});

// Get maintenance requests
app.get('/api/maintenance', (req, res) => {
    const { department } = req.query;
    let query = 'SELECT * FROM maintenance_requests';
    let params = [];

    if (department) {
        query += ' WHERE department = ?';
        params.push(department);
    }
    query += ' ORDER BY requested_date DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Add maintenance request
app.post('/api/maintenance', (req, res) => {
    const {
        sticker_no, equipment_name, manufacturer, model_no, department,
        issue_date, issue_description, priority, requested_by
    } = req.body;

    const query = `
        INSERT INTO maintenance_requests (
            sticker_no, equipment_name, manufacturer, model_no, department,
            issue_date, issue_description, priority, requested_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [
        sticker_no, equipment_name, manufacturer, model_no, department,
        issue_date, issue_description, priority || 'Medium', requested_by
    ], function(err) {
        if (err) {
            console.error('Error creating maintenance request:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({ id: this.lastID, message: 'Maintenance request created' });
    });
});

// Update maintenance request
app.put('/api/maintenance/:id', (req, res) => {
    const { status, notes } = req.body;

    db.run(
        `UPDATE maintenance_requests 
         SET status = ?, notes = ?, 
             completed_date = CASE WHEN ? = 'Completed' THEN CURRENT_TIMESTAMP ELSE completed_date END
         WHERE id = ?`,
        [status, notes, status, req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Maintenance request not found' });
                return;
            }
            res.json({ message: 'Maintenance request updated' });
        }
    );
});

// Delete maintenance request
app.delete('/api/maintenance/:id', (req, res) => {
    db.run('DELETE FROM maintenance_requests WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Maintenance request not found' });
            return;
        }
        res.json({ message: 'Maintenance request deleted' });
    });
});

// Get transfer notifications for a department
app.get('/api/notifications/:department', (req, res) => {
    const { department } = req.params;
    
    db.all(
        'SELECT * FROM transfer_notifications WHERE to_department = ? ORDER BY date DESC',
        [department],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows || []);
        }
    );
});

// Create transfer notification
app.post('/api/notifications', (req, res) => {
    const {
        equipment_name, sticker_no, from_department, to_department,
        reason, transferred_by, authorized_by
    } = req.body;

    const query = `
        INSERT INTO transfer_notifications (
            equipment_name, sticker_no, from_department, to_department,
            reason, transferred_by, authorized_by, read_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `;

    db.run(query, [
        equipment_name, sticker_no, from_department, to_department,
        reason, transferred_by, authorized_by
    ], function(err) {
        if (err) {
            console.error('Error creating notification:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({ id: this.lastID, message: 'Notification created' });
    });
});

// Mark notification as read
app.put('/api/notifications/:id/read', (req, res) => {
    db.run('UPDATE transfer_notifications SET read_status = 1 WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Notification marked as read' });
    });
});

// Clear all notifications for department
app.delete('/api/notifications/:department/clear', (req, res) => {
    db.run('DELETE FROM transfer_notifications WHERE to_department = ?', [req.params.department], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'All notifications cleared' });
    });
});

// ============ USER AUTHENTICATION & PASSWORD ROUTES ============

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                department: user.department
            }
        });
    });
});

// Change password
app.put('/api/users/change-password', (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    
    if (!username || !oldPassword || !newPassword) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (newPassword.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, oldPassword], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!user) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        db.run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?', 
            [newPassword, username], 
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Password changed successfully' });
            }
        );
    });
});

// Reset user password (Admin only)
app.put('/api/users/reset-password', (req, res) => {
    const { adminUsername, adminPassword, targetUsername, newPassword } = req.body;
    
    // Verify admin credentials
    db.get('SELECT * FROM users WHERE username = ? AND password = ? AND role = ?', 
        [adminUsername, adminPassword, 'Super Admin'], 
        (err, admin) => {
            if (err || !admin) {
                return res.status(403).json({ error: 'Unauthorized. Only Super Admin can reset passwords' });
            }
            
            if (!newPassword || newPassword.length < 4) {
                return res.status(400).json({ error: 'New password must be at least 4 characters' });
            }
            
            db.run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?', 
                [newPassword, targetUsername], 
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    if (this.changes === 0) {
                        return res.status(404).json({ error: 'User not found' });
                    }
                    res.json({ message: `Password reset for ${targetUsername}` });
                }
            );
        }
    );
});

// Get all users (Admin only)
app.get('/api/users', (req, res) => {
    const { adminUsername, adminPassword } = req.query;
    
    db.get('SELECT * FROM users WHERE username = ? AND password = ? AND role = ?', 
        [adminUsername, adminPassword, 'Super Admin'], 
        (err, admin) => {
            if (err || !admin) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            
            db.all('SELECT id, username, name, role, department, created_at, updated_at FROM users ORDER BY id', 
                (err, rows) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json(rows);
                }
            );
        }
    );
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log('📊 API endpoints ready:\n');
    console.log('   GET    /api/equipment');
    console.log('   POST   /api/equipment');
    console.log('   DELETE /api/equipment/:id');
    console.log('   PUT    /api/equipment/:id/transfer');
    console.log('   GET    /api/maintenance');
    console.log('   POST   /api/maintenance');
    console.log('   PUT    /api/maintenance/:id');
    console.log('   DELETE /api/maintenance/:id');
    console.log('   GET    /api/notifications/:department');
    console.log('   POST   /api/notifications');
    console.log('   PUT    /api/notifications/:id/read');
    console.log('   DELETE /api/notifications/:department/clear');
    console.log('   POST   /api/login');
    console.log('   PUT    /api/users/change-password');
    console.log('   PUT    /api/users/reset-password');
    console.log('   GET    /api/users');
    console.log('   GET    /api/health\n');
});