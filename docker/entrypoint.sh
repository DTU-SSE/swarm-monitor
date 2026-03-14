#!/usr/bin/env bash

case "$1" in
  factory-monitor)
    java -jar monitors/factory-monitor.jar port=9999 address=0.0.0.0
    ;;
  factory-swarm)
    MONITOR=monitor
    cd swarms/factory && bash start_factory_forwarding.sh "session1" "$MONITOR" "9999" "/dev/null" "/dev/null"
    ;;
  *)
    echo "usage: factory-monitor | factory-swarm"
    exit 1
    ;;
esac