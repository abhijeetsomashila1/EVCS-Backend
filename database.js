const { Pool } = require("pg");

const pool = new Pool({
    host: "10.3.0.121",
    user: "postgres",
    password: "postgresql",
    database: "evcharger",
    port: 5432
});

pool.connect((error) => {
    if (error) {
        console.log("PostgreSQL Connection Failed");
        console.log(error);
    } else {
        console.log("PostgreSQL Connected Successfully");
    }
});

module.exports = pool;