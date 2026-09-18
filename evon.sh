#!/usr/bin/env bash
# Turn EV Charger Relay ON (GPIO 17)
# Supports pinctrl (Bookworm/Pi 5), raspi-gpio (Bullseye), and Python RPi.GPIO fallback

pinctrl set 17 op dh 2>/dev/null || \
raspi-gpio set 17 op dh 2>/dev/null || \
python3 -c "import RPi.GPIO as G; G.setwarnings(False); G.setmode(G.BCM); G.setup(17, G.OUT); G.output(17, G.HIGH)" 2>/dev/null

echo "EV Charger Relay ON (GPIO 17 -> HIGH)"