const { Pool } = require('pg');

// Connect to PostgreSQL database hosted on the user's Windows PC
const pool = new Pool({
    user: 'postgres',
    host: '10.2.140.183',
    database: 'evcharger', 
    password: 'Brun#@bh1', 
    port: 5432,
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error acquiring client from PostgreSQL pool', err.stack);
    } else {
        console.log('Connected to PostgreSQL database successfully at 10.2.140.183');
        release();
    }
});

// Initialize tables and default data
const initDb = async () => {
    try {
        // Users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                phone VARCHAR(20),
                password VARCHAR(255)
            )
        `);

        // Chargers table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chargers (
                charger_id VARCHAR(50) PRIMARY KEY,
                wisun_id VARCHAR(255),
                location VARCHAR(255),
                status VARCHAR(50) DEFAULT 'AVAILABLE'
            )
        `);

        // Charging sessions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS charging_sessions (
                session_id SERIAL PRIMARY KEY,
                user_id INT,
                charger_id VARCHAR(50),
                status VARCHAR(50),
                start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id),
                FOREIGN KEY (charger_id) REFERENCES chargers (charger_id)
            )
        `);

        // Insert default admin user if not exists
        const resUser = await pool.query("SELECT * FROM users WHERE email = $1", ['evcharger@scrc.com']);
        if (resUser.rows.length === 0) {
            await pool.query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3)`, 
                ['EV Admin', 'evcharger@scrc.com', 'Scrc123']);
        }

        // Insert default charger if not exists
        const resCharger = await pool.query("SELECT * FROM chargers WHERE charger_id = $1", ['EV001']);
        if (resCharger.rows.length === 0) {
            await pool.query(`INSERT INTO chargers (charger_id, wisun_id) VALUES ($1, $2)`, 
                ['EV001', 'fd12:3456::a66d:d4ff:fefc:b292']);
        }
    } catch (err) {
        console.error('Error initializing PostgreSQL tables:', err);
    }
};

initDb();

module.exports = pool;