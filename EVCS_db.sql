
322222222z.xATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20)
);

CREATE TABLE chargers (
    charger_id VARCHAR(50) PRIMARY KEY,
    wisun_id VARCHAR(255),
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'AVAILABLE'
);

CREATE TABLE charging_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INT,
    charger_id VARCHAR(50),
    status VARCHAR(50),
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP
);

INSERT INTO chargers (charger_id, wisun_id) VALUES ('EV001', 'fd12:3456::1');
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);

INSERT INTO users (name, email, password)
VALUES ('EV Admin', 'evcharger@scrc.com', 'Scrc123');
SELECT * FROM public.users
ORDER BY user_id ASC 

CREATE TABLE meter_values
(
id INT AUTO_INCREMENT PRIMARY KEY,

charger_id VARCHAR(50),

transaction_id VARCHAR(100),

voltage FLOAT,

current FLOAT,

power FLOAT,

energy FLOAT,

timestamp DATETIME,

FOREIGN KEY (charger_id)
REFERENCES chargers(charger_id)
);
