#!/usr/bin/env bash

set -euo pipefail

app=$1
address="0.0.0.0"
port="9999"
swarm="swarm"
monitor_name=""

shift 1

if [ "$app" = "$swarm" ]; then
  while getopts ":m:" opt; do
    case "${opt}" in
      m)
        monitor_name=$OPTARG
        ;;
      *)
        echo "Supply a monitor name with -m <MONITOR NAME> when running a swarm: ./entrypoint.sh swarm -m <MONITOR NAME>"
        exit 1
        ;;
    esac
  done

  if [ -z "$monitor_name" ]; then
    echo "Supply a monitor name with -m <MONITOR NAME>"
    exit 1
  fi
fi

case "$app" in
  monitor)
    exec java -jar monitors/factory-monitor.jar "port=$port" "address=$address"
    ;;
  swarm)
    cd swarms/factory
    exec ./start_factory_forwarding.sh "session1" "$monitor_name" "$port" "/dev/null" "/dev/null"
    ;;
  *)
    echo "usage: monitor | swarm"
    exit 1
    ;;
esac