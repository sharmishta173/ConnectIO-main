#!/bin/bash

# ConnectIO Startup Script

echo "🚀 Starting ConnectIO..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "⚙️  Creating .env file from template..."
  cp .env.example .env
  echo "⚠️  Please edit .env with your configuration"
fi

echo "✅ Starting Express server with integrated PeerJS..."
echo "🌐 Visit: http://localhost:3030"
echo ""

# Start the server
npm start
