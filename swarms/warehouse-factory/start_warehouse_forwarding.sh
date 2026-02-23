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

version="Warehouse"
START_TRANSPORT="npm run start-transport -- $version; exec bash"
START_DOOR="npm run start-door -- $version; exec bash"
START_FORKLIFT="npm run start-forklift -- $version; exec bash"
START_FORWARDER="npm run start-forwarder -- --address="$address" --port="$port";exec bash"

npm run build >> $build_log 2>&1

bash ../split_and_run.sh $session_name $ax_log "$START_TRANSPORT" "$START_DOOR" "$START_FORKLIFT" "$START_FORWARDER"