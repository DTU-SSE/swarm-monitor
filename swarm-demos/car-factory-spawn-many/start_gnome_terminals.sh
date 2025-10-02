#!/usr/bin/env bash
# from ChatGPT
# 
# Usage: bash start_gnome_terminals.sh N 
# Example: bash start_gnome_terminals.sh 3

if [ $# -lt 1 ]; then
  echo "Usage: $0 N"
  exit 1
fi

N=$1
CMD="./start_machines.sh"

for ((i=1; i<=N; i++)); do
  session_id="session${i}" 
  gnome-terminal --maximize -- bash -c "$CMD ${session_id}; exec bash"
done
