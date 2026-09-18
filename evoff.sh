#!/bin/bash
# Force Relay OFF (Input High-Z stops current for SSR)
pinctrl set 17 ip pn 2>/dev/null || raspi-gpio set 17 ip pn