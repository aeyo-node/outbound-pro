#!/bin/bash
# ── Setup Daily Disk Cleanup ────────────────────────────────────────────────

SCRIPT_PATH="$(realpath cleanup.sh)"

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Error: cleanup.sh not found in the current directory."
    exit 1
fi

# Make cleanup script executable
chmod +x "$SCRIPT_PATH"

# Check if cron job already exists
(crontab -l 2>/dev/null | grep -q "$SCRIPT_PATH")
if [ $? -eq 0 ]; then
    echo "✅ Daily cleanup cron job is already configured."
else
    # Add to crontab to run at 3:00 AM every day
    (crontab -l 2>/dev/null; echo "0 3 * * * $SCRIPT_PATH >> /var/log/swaram_cleanup.log 2>&1") | crontab -
    echo "✅ Successfully scheduled daily cleanup at 3:00 AM."
fi

echo "To view your active cron jobs, run: crontab -l"
