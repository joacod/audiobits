#!/usr/bin/env bash
set -euo pipefail
# Configure the hosted Ubuntu mirror before either audio or Playwright installs.
# The Azure mirror can deliver package bodies too slowly for routine CI.
if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  sudo sed -i 's|http://azure.archive.ubuntu.com/ubuntu|https://archive.ubuntu.com/ubuntu|g' /etc/apt/sources.list.d/ubuntu.sources
fi
# Headless native audio needs an output clock, even without physical speakers.
sudo apt-get update
# pactl is shipped separately; avoid recommended desktop codecs and video drivers.
sudo apt-get install -y --no-install-recommends pulseaudio pulseaudio-utils
pulseaudio --start --exit-idle-time=-1
# Default null-sink buffering is two seconds; norewinds bounds it to 50 ms.
pactl load-module module-null-sink sink_name=audiobits_ci norewinds=1
pactl set-default-sink audiobits_ci
