#!/usr/bin/env bash

# $1 is tmux session name
# $2 is address of monitor
# $3 is port used by monitor
# $4 is ax log (defaults to stdout)
# $5 is build log (defaults to stdout)

session_name=$1
address=$2
port=$3
ax_log="${4:-/dev/stdout}"
build_log="${5:-/dev/stdout}"

version="WarehouseFactory"
START_TRANSPORT="node dist/machine_drivers/transport.js $version; exec bash"
START_DOOR="node dist/machine_drivers/door.js $version; exec bash"
START_FORKLIFT="node dist/machine_drivers/forklift.js $version; exec bash"
START_ROBOT="node dist/machine_drivers/factory_robot.js $version; exec bash"
START_FORWARDER="node dist/forwarder.js --address="$address" --port="$port";exec bash"

npm run build >> $build_log 2>&1

bash ../split_and_run.sh $session_name $ax_log "$START_TRANSPORT" "$START_DOOR" "$START_FORKLIFT" "$START_ROBOT" "$START_FORWARDER"