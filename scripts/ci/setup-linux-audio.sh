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
  if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
    # Azure's mirror can stall package downloads. Prefer the Ubuntu HTTPS
    # mirrors, but retain Azure as a fallback if those mirrors are unavailable.
    sudo sed -i '\|://azure\.archive\.ubuntu\.com/ubuntu/|s/priority:1/priority:4/' /etc/apt/apt-mirrors.txt
  fi
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
