#!/bin/bash
echo echo -n -e "\033]2;Gies P2P Chat\007"
echo "Starting Gies P2P Chat Server..."
# Navigate to the folder where this script lives
cd "$(dirname "$0")/.."
# Start the server
node server.cjs