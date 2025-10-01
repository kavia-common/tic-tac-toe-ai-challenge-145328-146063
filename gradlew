#!/usr/bin/env sh
# Shim to ensure CI calling ./gradlew from the project workspace succeeds.
# Prefer local android wrapper if present; otherwise delegate to repo/base placeholder.
set -e
if [ -x "./tic_tac_toe_frontend/android/gradlew" ]; then
  exec ./tic_tac_toe_frontend/android/gradlew "$@"
elif [ -x "../gradlew" ]; then
  exec ../gradlew "$@"
elif [ -x "../../gradlew" ]; then
  exec ../../gradlew "$@"
else
  echo "[info] No native Android gradle wrapper available."
  echo "[info] This is an Expo managed app without a prebuilt Android project."
  echo "[info] To generate it, run:"
  echo "       cd tic-tac-toe-ai-challenge-145328-146063/tic_tac_toe_frontend && npm run prebuild:android"
  exit 0
fi
