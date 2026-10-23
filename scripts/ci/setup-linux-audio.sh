#!/usr/bin/env bash
set -euo pipefail
phase() {
  local label="$1" started=$SECONDS
  shift
  echo "Provisioning $label started"
  "$@"
  echo "Provisioning $label: $((SECONDS - started))s"
}
install_os() {
  # The pinned CLI refreshes apt indexes once and installs Chromium dependencies.
  pnpm exec playwright install-deps chromium
  # Reuse those indexes for the real output clock, without a second update.
  sudo apt-get install -y --no-install-recommends pulseaudio
}
start_audio() {
  pulseaudio --start --exit-idle-time=-1
  # Default null-sink buffering is two seconds; norewinds bounds it to 50 ms.
  pactl load-module module-null-sink sink_name=audiobits_ci norewinds=1
  pactl set-default-sink audiobits_ci
  test "$(pactl get-default-sink)" = audiobits_ci
  pactl list short sinks | awk '$2 == "audiobits_ci" { found = 1 } END { exit !found }'
}
phase "OS installation" install_os
phase "Chromium headless-shell download" pnpm exec playwright install --only-shell chromium
phase "audio startup and verification" start_audio
