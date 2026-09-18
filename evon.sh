#!/bin/bash
# Force Relay ON (Input/High-Z)
pinctrl set 17 ip pn 2>/dev/null || raspi-gpio set 17 ip pn