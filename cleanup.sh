#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Swaram AI Server — Master Cleanup Script
#  Runs: daily at 3 AM via cron  +  on every SSH login (light mode)
#
#  Usage:
#    Full clean  : sudo bash cleanup.sh
#    Light check : bash cleanup.sh --check
# ═══════════════════════════════════════════════════════════════

MODE="${1:-full}"   # "full" (default, cron/manual) or "check" (SSH login)

# ── Colours ────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo -e "${GREEN}  ✔ $*${NC}"; }
warn() { echo -e "${YELLOW}  ⚠ $*${NC}"; }
err()  { echo -e "${RED}  ✘ $*${NC}"; }
info() { echo -e "${CYAN}  → $*${NC}"; }

# ── Disk usage helper ──────────────────────────────────────────
disk_used_pct() { df / | tail -1 | awk '{print $5}' | tr -d '%'; }
disk_summary()  { df -h / | tail -1 | awk '{print $3 " used / " $2 " total (" $5 ")"}'; }

# ══════════════════════════════════════════════════════════════
#  CHECK MODE  — runs on every SSH login, very fast
# ══════════════════════════════════════════════════════════════
if [ "$MODE" = "--check" ]; then
    echo ""
    echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║     Swaram Server Health Check       ║${NC}"
    echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"

    # Disk usage
    PCT=$(disk_used_pct)
    SUMMARY=$(disk_summary)
    if   [ "$PCT" -ge 90 ]; then err  "DISK CRITICAL: $SUMMARY — run: sudo bash ~/outbound-pro/cleanup.sh"
    elif [ "$PCT" -ge 75 ]; then warn "DISK WARNING:  $SUMMARY — cleanup runs at 3 AM"
    else                         ok   "Disk:          $SUMMARY"
    fi

    # Docker containers
    TOTAL=$(docker ps -q 2>/dev/null | wc -l)
    UNHEALTHY=$(docker ps --filter "health=unhealthy" -q 2>/dev/null | wc -l)
    STOPPED=$(docker ps -a --filter "status=exited" -q 2>/dev/null | wc -l)
    if   [ "$UNHEALTHY" -gt 0 ]; then err  "Docker: $UNHEALTHY unhealthy container(s)! Run: sudo docker ps"
    elif [ "$STOPPED"   -gt 0 ]; then warn "Docker: $TOTAL running, $STOPPED stopped container(s)"
    else                              ok   "Docker: $TOTAL containers all running"
    fi

    # Memory
    MEM=$(free -h | grep Mem | awk '{print $3 " used / " $2 " total"}')
    MEM_PCT=$(free | grep Mem | awk '{printf "%.0f", $3/$2*100}')
    if   [ "$MEM_PCT" -ge 90 ]; then err  "Memory: $MEM (${MEM_PCT}%)"
    elif [ "$MEM_PCT" -ge 75 ]; then warn "Memory: $MEM (${MEM_PCT}%)"
    else                             ok   "Memory: $MEM (${MEM_PCT}%)"
    fi

    # Dangling Docker images (wasteful)
    DANGLING=$(docker images -f "dangling=true" -q 2>/dev/null | wc -l)
    if [ "$DANGLING" -gt 0 ]; then
        warn "Docker: $DANGLING dangling image(s) wasting space — will be cleaned at 3 AM"
    fi

    # Stopped containers accumulation
    if [ "$STOPPED" -gt 5 ]; then
        warn "Docker: $STOPPED stopped containers accumulating — cleaning now..."
        docker container prune -f >/dev/null 2>&1
        ok   "Stopped containers cleaned"
    fi

    # Journal log size
    JOURNAL_SIZE=$(journalctl --disk-usage 2>/dev/null | grep -oP '[\d.]+[MGK]' | head -1)
    if [ -n "$JOURNAL_SIZE" ]; then
        info "System journal: $JOURNAL_SIZE"
    fi

    echo ""
    echo -e "  ${CYAN}Tip: Run ${BOLD}sudo bash ~/outbound-pro/cleanup.sh${NC}${CYAN} for a full deep clean${NC}"
    echo ""
    exit 0
fi


# ══════════════════════════════════════════════════════════════
#  FULL MODE  — daily cron at 3 AM, or manual run
# ══════════════════════════════════════════════════════════════
echo ""
log "=== SWARAM FULL DISK CLEANUP STARTED ==="
BEFORE=$(disk_summary)
BEFORE_PCT=$(disk_used_pct)
log "Disk BEFORE: $BEFORE"
echo ""

# ── 1. Docker: stopped containers ─────────────────────────────
log "Docker: removing stopped containers..."
docker container prune -f && ok "Stopped containers removed" || warn "Nothing to remove"

# ── 2. Docker: dangling images ────────────────────────────────
log "Docker: removing dangling images..."
docker image prune -f && ok "Dangling images removed" || warn "Nothing to remove"

# ── 3. Docker: ALL unused images (not used by running containers)
log "Docker: removing ALL unused images..."
docker image prune -af && ok "Unused images removed" || warn "Nothing to remove"

# ── 4. Docker: build cache ────────────────────────────────────
log "Docker: removing build cache..."
docker builder prune -af && ok "Build cache removed" || warn "Nothing to remove"

# ── 5. Docker: orphaned volumes ───────────────────────────────
log "Docker: removing unused volumes..."
docker volume prune -f && ok "Unused volumes removed" || warn "Nothing to remove"

# ── 6. Journal logs — keep 2 days, max 100 MB ─────────────────
log "System: vacuuming journal logs..."
journalctl --vacuum-time=2d --vacuum-size=100M
ok "Journal logs trimmed"

# ── 7. Ubuntu apt cache ───────────────────────────────────────
log "System: cleaning apt cache..."
apt-get clean -y && apt-get autoremove -y -qq
ok "Apt cache cleaned"

# ── 8. Truncate large log files (keep last 1000 lines each) ───
log "System: truncating large /var/log files..."
find /var/log -type f -name "*.log" | while read -r f; do
    SIZE=$(stat -c%s "$f" 2>/dev/null || echo 0)
    if [ "$SIZE" -gt 10485760 ]; then  # > 10 MB
        tail -n 1000 "$f" > "$f.tmp" && mv "$f.tmp" "$f"
        info "Trimmed: $f (was $(numfmt --to=iec $SIZE))"
    fi
done
# Remove old rotated logs
find /var/log -type f \( -name "*.gz" -o -name "*.1" -o -name "*.old" -o -name "*.[0-9]" \) -delete
ok "/var/log rotated files removed"

# ── 9. App log files in /data (keep 7 days) ───────────────────
log "App: cleaning old /data logs and recordings..."
find /data -name "*.log" -type f -mtime +7  -delete 2>/dev/null || true
find /data -name "*.mp4" -type f -mtime +3  -delete 2>/dev/null || true
find /data -name "*.ogg" -type f -mtime +3  -delete 2>/dev/null || true
ok "Old recordings and logs removed from /data"

# ── 10. Temp files older than 7 days ──────────────────────────
log "System: removing stale temp files..."
find /tmp -type f -mtime +7 -delete 2>/dev/null || true
ok "Temp files cleaned"

# ── 11. npm cache (if installed on host) ──────────────────────
if command -v npm &>/dev/null; then
    log "npm: clearing cache..."
    npm cache clean --force 2>/dev/null && ok "npm cache cleared" || true
fi

# ── 12. pip cache ─────────────────────────────────────────────
if command -v pip3 &>/dev/null; then
    log "pip: clearing cache..."
    pip3 cache purge 2>/dev/null && ok "pip cache cleared" || true
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
AFTER=$(disk_summary)
AFTER_PCT=$(disk_used_pct)
SAVED=$((BEFORE_PCT - AFTER_PCT))

log "=== CLEANUP COMPLETE ==="
log "Disk BEFORE : $BEFORE"
log "Disk AFTER  : $AFTER"
if [ "$SAVED" -gt 0 ]; then
    ok  "Freed approx ${SAVED}% of disk space"
else
    info "No significant space freed (already clean)"
fi

if   [ "$AFTER_PCT" -ge 90 ]; then err  "DISK STILL CRITICAL at ${AFTER_PCT}% — investigate immediately!"
elif [ "$AFTER_PCT" -ge 75 ]; then warn "Disk at ${AFTER_PCT}% — monitor closely"
else                               ok   "Disk healthy at ${AFTER_PCT}%"
fi
echo ""
