#!/bin/bash
PORT=${1:-8080}
export PORT
node "$(dirname "$0")/server.js"
