#!/usr/bin/env bash

port="9999"
monitor_name=""

while getopts ":m:" opt; do
    case "${opt}" in
        m)
        monitor_name=$OPTARG
        ;;
        *)
        echo "Supply a monitor name with -m <MONITOR NAME> when running a swarm: ./swarm -m <MONITOR NAME>"
        exit 1
        ;;
    esac
done

if [ -z "$monitor_name" ]; then
    echo "Supply a monitor name with -m <MONITOR NAME>"
    exit 1
fi


