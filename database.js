const { Pool } = require("pg");

const pool = new Pool({
    host: "127.0.0.1",
    user: "postgres",
    password: "Brun#@bh1",
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