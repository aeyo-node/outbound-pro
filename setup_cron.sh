#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  setup_cron.sh — Registers:
#   1. Daily full cleanup at 3:00 AM
#   2. SSH login health check via /etc/profile.d/
# ═══════════════════════════════════════════════════════════════

CLEANUP_SCRIPT="$(cd "$(dirname "$0")" && pwd)/cleanup.sh"

if [ ! -f "$CLEANUP_SCRIPT" ]; then
    echo "❌ Error: cleanup.sh not found at $CLEANUP_SCRIPT"
    exit 1
fi

chmod +x "$CLEANUP_SCRIPT"

# ── 1. Daily cron at 3:00 AM ──────────────────────────────────
CRON_CMD="0 3 * * * bash $CLEANUP_SCRIPT >> /var/log/swaram_cleanup.log 2>&1"
if crontab -l 2>/dev/null | grep -qF "$CLEANUP_SCRIPT"; then
    echo "✅ Daily cleanup cron already registered."
else
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    echo "✅ Daily cleanup scheduled at 3:00 AM."
fi

# ── 2. SSH login health check ─────────────────────────────────
PROFILE_FILE="/etc/profile.d/swaram_health.sh"
sudo tee "$PROFILE_FILE" > /dev/null << PROFILE
#!/bin/bash
# Swaram health check on SSH login
if [ -f "$CLEANUP_SCRIPT" ]; then
    bash "$CLEANUP_SCRIPT" --check
fi
PROFILE
sudo chmod +x "$PROFILE_FILE"
echo "✅ SSH login health check registered at $PROFILE_FILE"

echo ""
echo "Done! Every time you SSH into this server, you will see:"
echo "  ✔ Disk usage status (warns at 75%, critical at 90%)"
echo "  ✔ Docker container health"
echo "  ✔ Memory usage"
echo "  ✔ Auto-cleans stopped containers if >5 accumulate"
echo ""
echo "Full deep clean runs automatically every day at 3:00 AM."
echo "To run a manual full clean now: sudo bash $CLEANUP_SCRIPT"
