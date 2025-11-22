#!/bin/sh

# 1. Start Redis Server in the background
redis-server --daemonize yes

# 2. Wait for Redis to actually be ready
echo "Waiting for Redis to start..."
until redis-cli ping | grep -q "PONG"; do
  sleep 1
done
echo "Redis is up."

# 3. Run the Python Seeder
echo "Running Seeder..."
python3 /app/seed.py

# 4. Bring Redis to foreground / Keep container alive
# We shut down the background daemon and restart it in foreground
# to ensure Docker handles logs and signals correctly.
redis-cli shutdown
echo "Restarting Redis in foreground..."
exec redis-server