#!/bin/sh
set -e

export PORT=${PORT:-8081}
export HOST=${HOST:-0.0.0.0}

node /app/hub/src/server.js &
HUB_PID=$!

nginx -g 'daemon off;' &
NGINX_PID=$!

wait -n $HUB_PID $NGINX_PID
exit $?
