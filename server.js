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
const pzem = require("./routes/pzem");
app.use("/api/pzem", pzem.router);



const path = require("path");

// Serve frontend static files
const frontendPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendPath));

// Catch-all route to serve index.html for React Router (must be AFTER API routes)
app.get("*", (req, res) => {
    // Prevent catching API routes that aren't found
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: "API endpoint not found" });
    }
    res.sendFile(path.join(frontendPath, "index.html"));
});

// Start HTTP server
app.listen(3000, "0.0.0.0", ()=>{
    console.log("Server started on port 3000");
});

// Graceful shutdown
function handleExit(signal) {
    console.log(`\nReceived ${signal}. Shutting down...`);
    process.exit(0);
}
process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

// Start UDP Server to listen for Wi-SUN packets from the EV Charger
const dgram = require("dgram");
const udpServer = dgram.createSocket("udp6");

udpServer.on("message", (msg, rinfo) => {
    const message = msg.toString().trim();
    console.log(`[Local UDP] Received from ${rinfo.address}: ${message}`);
    
    // Parse incoming PZEM telemetry from the local Python script
    // Expected format: METRICS:V:230.5,A:10.25,W:2362.6,Wh:15.0
    if (message.startsWith("METRICS:")) {
        try {
            const metricsPart = message.substring("METRICS:".length);
            const pairs = metricsPart.split(',');
            
            let energy_Wh = null;
            for (let pair of pairs) {
                const [key, val] = pair.split(':');
                if (key === 'Wh') {
                    energy_Wh = parseFloat(val);
                    break;
                }
            }
            
            if (energy_Wh !== null) {
                // Pass the real-time energy to the pzem logic to handle auto-stop and the website progress bar
                pzem.handleNewEnergy(energy_Wh);
            }
        } catch (e) {
            console.error(`[Local UDP] Error parsing metrics: ${e.message}`);
        }
    }
});

udpServer.on("listening", () => {
    const address = udpServer.address();
    console.log(`[Local UDP] Server listening on port ${address.port}`);
});

// Bind to port 5000 (as defined in Charger_script.py LOCAL_UDP_PORT)
udpServer.bind(5000);