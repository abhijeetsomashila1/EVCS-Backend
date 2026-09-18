#!/bin/bash
# Force Relay ON (Output LOW sinks current for SSR)
pinctrl set 17 op dl 2>/dev/null || raspi-gpio set 17 op dl