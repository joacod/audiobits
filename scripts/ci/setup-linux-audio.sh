#!/usr/bin/env bash
set -euo pipefail
# Headless native audio needs an output clock, even without physical speakers.
sudo apt-get update
sudo apt-get install -y pulseaudio
pulseaudio --start --exit-idle-time=-1
# Default null-sink buffering is two seconds; norewinds bounds it to 50 ms.
pactl load-module module-null-sink sink_name=audiobits_ci norewinds=1
pactl set-default-sink audiobits_ci
