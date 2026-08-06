# EV Charger Backend Architecture (Detailed Guide)

This document provides a deep, technical breakdown of how the Node.js backend operates. The backend is designed to run on a Raspberry Pi acting as a Wi-SUN Border Router. It serves as the "brain" of the entire charging ecosystem, bridging the frontend web application, the physical Wi-SUN mesh network, and the external PostgreSQL database.

---

## 1. System Topology & The Dual-Server Model

When you run `node server.js`, the backend actually spins up **two separate servers** simultaneously inside the same Node.js process:

1. **The HTTP REST API (Port 3000):** Built with Express.js, this server listens for traditional web traffic. The frontend React application talks to this server to log users in, start charging sessions, and fetch charging history.
2. **The UDP IPv6 Socket (Port 5000):** Built with Node's native `dgram` module, this socket continuously listens for raw UDP packets arriving over the Wi-SUN wireless mesh network from the physical EV charger nodes (EFR32 boards).

By running both in the same process, the backend can receive a web request from a user's phone, and instantly translate it into a physical action on the mesh network.

---

## 2. The Wi-SUN Mesh Network Integration

The most complex part of this backend is how it communicates with the physical hardware. EV chargers are IoT nodes on a Wi-SUN mesh network. They do not have standard IP addresses that stay the same forever. 

### Dynamic IP Discovery (`HELLO:` packets)
When an EV charger (EFR32 node) turns on, it broadcasts a UDP packet to the Border Router containing the string `HELLO:EV001`. 
In `server.js`, the UDP listener catches this packet:
- It extracts the charger ID (`EV001`).
- It extracts the IPv6 address that the packet originated from.
- It runs an SQL `UPDATE` query on the `chargers` table to save this new IPv6 address (`wisun_id`).
Because of this, the backend always knows exactly where to send commands, even if the node's IP changes.

### Live Telemetry (`METRICS:` packets)
While a car is charging, the EFR32 node reads data from the PZEM sensor and transmits it over the mesh network as a string: `METRICS:V:230.5,A:10.25,W:2362.6,Wh:15.0`.
In `server.js`:
- The UDP listener intercepts this packet.
- It parses the string, specifically looking for the `Wh` (Watt-hours) value.
- It immediately passes this real-time energy value into the internal auto-stop logic located in `routes/pzem.js`.

---

## 3. The Auto-Stop Logic (`routes/pzem.js`)

This is the critical safety and billing loop of the application. When a user requests to charge exactly "1.5 Units" (1.5 kWh), the charger must physically shut off the moment that target is hit.

Here is the exact flow when a `METRICS:` packet arrives:
1. `server.js` calls `pzem.handleNewEnergy(1500)` (e.g., 1500 Wh).
2. `pzem.js` queries the database for any session where `status = 'Charging'`.
3. It retrieves the target amount requested by the user.
4. It divides the live `Wh` by 1000 to convert to kWh (Units).
5. It compares the two: `if (currentUnits >= targetUnits)`.
6. If the target is reached, it triggers the physical shutdown sequence (executing `evoff.sh`).
7. It updates the `charging_sessions` table in the database, setting the `end_time` to `CURRENT_TIMESTAMP` and the status to `Completed`.
8. It marks the charger as `AVAILABLE` again.

---

## 4. Physical Relay Control (`evon.sh` & `evoff.sh`)

The backend cannot magically turn off electricity using JavaScript. It relies on the Wi-SUN protocol known as **CoAP** (Constrained Application Protocol).

The Raspberry Pi has a command-line tool installed called `coap-client-notls`. 
In the root of the backend, there are two bash scripts:
- `evon.sh`: `coap-client-notls -m put -T "1" coap://[IPv6_ADDRESS]/relay`
- `evoff.sh`: `coap-client-notls -m put -T "0" coap://[IPv6_ADDRESS]/relay`

When a user clicks "Start Charging" on the website, the Express route in `routes/sessions.js` uses Node's `child_process.exec()` module to run `evon.sh` directly in the Linux terminal. This blasts the CoAP command over the mesh network, telling the EFR32 board to snap the physical relay shut, allowing high-voltage AC power to flow to the car.

---

## 5. Database Architecture

The backend relies on a robust relational database (PostgreSQL), which is hosted on a separate Windows PC to prevent the Raspberry Pi's SD card from degrading due to constant read/writes. `database.js` manages a connection pool to this external IP.

There are three primary tables:

1. **`users`**
   - Stores user credentials and basic information. 
   - Handles authentication in `routes/auth.js`.

2. **`chargers`**
   - Tracks the physical hardware. 
   - Stores `charger_id` (e.g., "EV001").
   - Stores `status` ("AVAILABLE", "IN_USE", "MAINTENANCE").
   - Stores the critically important `wisun_id` (the dynamic IPv6 address learned from the HELLO packets).

3. **`charging_sessions`**
   - The ledger of all charging activity.
   - Links a `user_id` to a `charger_id`.
   - Records `start_time`, `end_time`, and the `amount` (target units).
   - Tracks `status` ("Charging", "Completed", "Failed").

---

## 6. Request Lifecycle: "Start Charging"

To summarize how all these pieces fit together, here is the chronological flow of a user starting a charge:

1. **Frontend:** User clicks "Start Charging" for 10 units. React sends an HTTP POST to `http://PI_IP:3000/api/session/start`.
2. **Backend (`sessions.js`):** Receives the request. Checks if `EV001` is `AVAILABLE`.
3. **Database:** Inserts a new row into `charging_sessions` with `status = 'Charging'` and `amount = 10`. Updates `EV001` to `IN_USE`.
4. **Linux Shell:** Backend spawns a child process and executes `evon.sh`.
5. **Wi-SUN Mesh:** The CoAP packet travels wirelessly to the EFR32 node, turning the relay on.
6. **Telemetry Loop:** The EFR32 starts sending `METRICS:` UDP packets back to the Pi.
7. **Auto-Stop (`pzem.js`):** Constantly monitors the incoming metrics until `10 units` is reached, then executes `evoff.sh` and closes the database session.
