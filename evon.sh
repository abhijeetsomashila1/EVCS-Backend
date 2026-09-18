#!/bin/bash
# Try the global command first, fallback to raw commands
/usr/bin/evon 2>/dev/null || pinctrl set 17 ip pn 2>/dev/null || raspi-gpio set 17 ip pn