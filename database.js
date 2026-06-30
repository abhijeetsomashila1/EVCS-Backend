const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database (will create evcharger.db in the backend folder if it doesn't exist)
const dbPath = path.resolve(__dirname, 'evcharger.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to the SQLite database successfully at', dbPath);
    }
});

// Initialize tables and default data
db.serialize(() => {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            phone TEXT,
            password TEXT
        )
    `);

    // Chargers table
    db.run(`
        CREATE TABLE IF NOT EXISTS chargers (
            charger_id TEXT PRIMARY KEY,
            wisun_id TEXT,
            location TEXT,
            status TEXT DEFAULT 'AVAILABLE'
        )
    `);

    // Charging sessions table
    db.run(`
        CREATE TABLE IF NOT EXISTS charging_sessions (
            session_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            charger_id TEXT,
            status TEXT,
            start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            end_time DATETIME,
            FOREIGN KEY (user_id) REFERENCES users (user_id),
            FOREIGN KEY (charger_id) REFERENCES chargers (charger_id)
        )
    `);

    // Insert default admin user if not exists
    db.get("SELECT * FROM users WHERE email = ?", ['evcharger@scrc.com'], (err, row) => {
        if (!err && !row) {
            db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, 
                ['EV Admin', 'evcharger@scrc.com', 'Scrc123']);
        }
    });

    // Insert default charger if not exists
    db.get("SELECT * FROM chargers WHERE charger_id = ?", ['EV001'], (err, row) => {
        if (!err && !row) {
            db.run(`INSERT INTO chargers (charger_id, wisun_id) VALUES (?, ?)`, 
                ['EV001', 'fd12:3456::a66d:d4ff:fefc:b292']);
        }
    });
});

module.exports = db;