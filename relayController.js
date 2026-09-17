const { Gpio } = require('onoff');

// Default to GPIO 17 (BCM) if not specified in environment
const RELAY_PIN = parseInt(process.env.RELAY_GPIO_PIN || '17', 10);

// Set to true if your relay module is Active-Low
const IS_ACTIVE_LOW = process.env.RELAY_ACTIVE_LOW === 'true';

const RELAY_ON_STATE = IS_ACTIVE_LOW ? 0 : 1;
const RELAY_OFF_STATE = IS_ACTIVE_LOW ? 1 : 0;

let relay = null;

/**
 * Initializes the GPIO pin for the relay.
 * Safely handles environments where GPIO is not available (e.g. Windows dev).
 */
function initializeRelay() {
    try {
        if (Gpio.accessible) {
            relay = new Gpio(RELAY_PIN, 'out');
            
            // Ensure relay is OFF on startup
            relay.writeSync(RELAY_OFF_STATE);
            console.log(`[Relay] Initialized on GPIO ${RELAY_PIN} (Active ${IS_ACTIVE_LOW ? 'Low' : 'High'})`);
        } else {
            console.warn('[Relay] GPIO is not accessible. Running in mock mode (simulation).');
        }
    } catch (error) {
        console.error('[Relay] Failed to initialize GPIO:', error);
    }
}

/**
 * Turns the relay ON to start charging.
 */
async function turnRelayOn() {
    return new Promise((resolve, reject) => {
        if (!relay) {
            console.log('[Relay Simulation] Relay turned ON');
            return resolve();
        }

        relay.write(RELAY_ON_STATE, (err) => {
            if (err) {
                console.error('[Relay] Failed to turn ON:', err);
                return reject(err);
            }
            console.log('[Relay] Relay turned ON');
            resolve();
        });
    });
}

/**
 * Turns the relay OFF to stop charging.
 */
async function turnRelayOff() {
    return new Promise((resolve, reject) => {
        if (!relay) {
            console.log('[Relay Simulation] Relay turned OFF');
            return resolve();
        }

        relay.write(RELAY_OFF_STATE, (err) => {
            if (err) {
                console.error('[Relay] Failed to turn OFF:', err);
                return reject(err);
            }
            console.log('[Relay] Relay turned OFF');
            resolve();
        });
    });
}

/**
 * Unexports the GPIO pin to free resources. Called on process exit.
 */
function cleanupRelay() {
    if (relay) {
        try {
            relay.writeSync(RELAY_OFF_STATE); // Ensure it's off before exit
            relay.unexport();
            console.log('[Relay] Cleaned up GPIO resources');
        } catch (error) {
            console.error('[Relay] Error during cleanup:', error);
        }
    }
}

module.exports = {
    initializeRelay,
    cleanupRelay,
    turnRelayOn,
    turnRelayOff
};
