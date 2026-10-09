const QRCode = require("qrcode");

const websiteURL = "http://localhost:5500/?charger_id=";

const DUMMY_CHARGERS = [
    { charger_id: "EV001" }
];

DUMMY_CHARGERS.forEach((charger) => {
    const chargerID = charger.charger_id;
    const url = websiteURL + chargerID;

    QRCode.toFile(
        `${chargerID}.png`,
        url,
        function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log("QR Created:", chargerID);
            }
        }
    );
});