const express = require("express");
const cors = require("cors");


const app = express();


// Allow frontend connection
app.use(cors());


// Read JSON data from frontend
app.use(express.json());



// Database connection
const db = require("./database");



// Routes

const usersRoute = require("./routes/users");
const chargerRoute = require("./routes/charger");
const sessionsRoute = require("./routes/sessions");
const qrRoute = require("./routes/qr");



// API connections

app.use("/api/auth", usersRoute);

app.use("/api/station", chargerRoute);

app.use("/api/session", sessionsRoute);

app.use("/api/qr", qrRoute);





// Test API

app.get("/",(req,res)=>{


    res.send("EV Charger Backend Running");


});






// Start HTTP server
app.listen(3000, "0.0.0.0", ()=>{
    console.log("Server started on port 3000");
});

// Start UDP Server to listen for Wi-SUN packets from the EV Charger
const dgram = require("dgram");
const udpServer = dgram.createSocket("udp6");

udpServer.on("message", (msg, rinfo) => {
    const message = msg.toString().trim();
    console.log(`[Wi-SUN UDP] Received from ${rinfo.address}: ${message}`);

    // If the EV charger announces itself, update its IP in the database!
    if (message.startsWith("HELLO:")) {
        const chargerId = message.split(":")[1];
        db.run("UPDATE chargers SET wisun_id=? WHERE charger_id=?", [rinfo.address, chargerId], (err) => {
            if (!err) {
                console.log(`[Wi-SUN] Learned new IP for ${chargerId}: ${rinfo.address}`);
            }
        });
    }
    
    // (Optional) Here you can also parse "METRICS:..." and update the UI via WebSockets or save to DB
});

udpServer.on("listening", () => {
    const address = udpServer.address();
    console.log(`[Wi-SUN] UDP server listening on port ${address.port}`);
});

// Bind to port 5000 (as defined in wisun_bridge.py SERVER_UDP_PORT)
udpServer.bind(5000);