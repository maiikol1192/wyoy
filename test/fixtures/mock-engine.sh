#!/bin/bash
MODE="${1:-normal}"
echo "Mock engine v1.0.0 ready (mode: $MODE)"
case "$MODE" in
  --crash)
    echo "Error: overloaded" >&2
    exit 1
    ;;
  --auth-fail)
    echo "Error: unauthorized - token expired" >&2
    exit 1
    ;;
  --network)
    echo "Error: connect ECONNREFUSED" >&2
    exit 1
    ;;
  *)
    while IFS= read -r line; do
      if [ "$line" = "exit" ]; then
        exit 0
      fi
      echo "Echo: $line"
    done
    exit 0
    ;;
esac
