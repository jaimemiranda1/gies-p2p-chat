#!/bin/bash
echo echo -n -e "\033]2;Gies P2P Chat Setup\007"
echo "Checking system requirements..."

# Check if Node is installed
if ! command -v node &> /dev/null
then
    echo ""
    echo "[ERROR] Node.js is not installed!"
    echo "Please download and install Node.js from https://nodejs.org/en/download"
    echo ""
    exit 1
fi

echo "Node.js is installed!"
echo ""

# Navigate to the script's folder, then go UP one level to the project root
cd "$(dirname "$0")/.."

echo "Step 1/2: Installing dependencies (this may take a minute)..."
npm install

echo ""
echo "Step 2/2: Compiling the production build..."
npm run build

echo ""
echo "Setup Complete! You can now close this window and double-click start-server.command."