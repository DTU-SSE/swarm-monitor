#!/usr/bin/env bash
# from ChatGPT
# Usage: bash start_gnome_terminals.sh N "command [args]"
# Example: bash start_gnome_terminals.sh 3 "htop"

if [ $# -lt 2 ]; then
  echo "Usage: $0 N \"command [args]\""
  exit 1
fi

N=$1
shift
CMD="$@"

for ((i=1; i<=N; i++)); do
  gnome-terminal --maximize -- bash -c "$CMD; exec bash"
done
