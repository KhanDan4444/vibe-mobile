#!/usr/bin/env bash
# Forward backend (5000) and Metro (8082) from a USB-connected Android device to this machine.
# Note: port 8081 may be taken by other local services — this project uses Metro on 8082.
set -euo pipefail

if ! command -v adb >/dev/null 2>&1; then
  echo "adb not found — skip USB port forwarding"
  exit 0
fi

if ! adb get-state >/dev/null 2>&1; then
  echo "No Android device — skip USB port forwarding"
  exit 0
fi

adb reverse tcp:5000 tcp:5000
adb reverse tcp:8082 tcp:8082
adb reverse tcp:8081 tcp:8081 2>/dev/null || true
echo "USB port forwarding active:"
adb reverse --list
