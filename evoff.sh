#!/bin/bash
# Try the global command first, fallback to raw commands
/usr/bin/evoff 2>/dev/null || pinctrl set 17 op dl 2>/dev/null || raspi-gpio set 17 op dl