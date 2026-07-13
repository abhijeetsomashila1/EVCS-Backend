const pool = require('./database');
pool.query("UPDATE chargers SET status = 'AVAILABLE'", (err, res) => {
    if (err) console.error(err);
    else console.log("Successfully reset all chargers to 'AVAILABLE'");
    
    pool.query("UPDATE charging_sessions SET status = 'Completed' WHERE status = 'Charging'", (err, res) => {
        if (err) console.error(err);
        else console.log("Successfully closed any stuck charging sessions");
        process.exit(0);
    });
});
