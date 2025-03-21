#!/bin/bash

# Start the server in the background
echo "Starting the server..."
cd server && npm run dev &
SERVER_PID=$!

# Start the client in the foreground
echo "Starting the client..."
npm run dev

# When the client is stopped, also kill the server
echo "Stopping server..."
kill $SERVER_PID 