#!/bin/bash
echo "Starting Gies P2P Chat Server..."
# Navigate to the folder where this script lives
cd "$(dirname "$0")"
# Start the server
node server.cjs