#!/usr/bin/env bash

case "$1" in
  factory-monitor)
    java -jar monitors/factory-monitor.jar
    ;;
  factory-swarm)
    cd swarms/factory && bash start_factory_forwarding.sh "session1" "localhost" "9999" "/dev/null" "/dev/null"
    ;;
  *)
    echo "usage: factory-monitor | factory-swarm"
    exit 1
    ;;
esac