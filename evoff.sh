#!/bin/bash
# Force Relay OFF (Output LOW)
pinctrl set 17 op dl 2>/dev/null || raspi-gpio set 17 op dl