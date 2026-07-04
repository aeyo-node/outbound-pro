#!/bin/bash
# ── Disk Cleanup Script for Swaram AI Server ─────────────────────────────────
echo "=== DISK USAGE BEFORE CLEANUP ==="
df -h /

echo ""
echo "=== TOP 10 LARGEST DIRECTORIES ==="
du -sh /* 2>/dev/null | sort -rh | head -10

echo ""
echo "=== DOCKER DISK USAGE ==="
docker system df

echo ""
echo "--- Removing stopped containers ---"
docker container prune -f

echo "--- Removing dangling images ---"
docker image prune -f

echo "--- Removing ALL unused images (not just dangling) ---"
docker image prune -af

echo "--- Removing unused volumes ---"
docker volume prune -f

echo "--- Removing build cache ---"
docker builder prune -af

echo ""
echo "=== APT CACHE CLEANUP ==="
sudo apt-get autoremove -y
sudo apt-get autoclean -y
sudo apt-get clean

echo ""
echo "=== JOURNAL LOG CLEANUP (keep only last 3 days) ==="
sudo journalctl --vacuum-time=3d

echo ""
echo "=== TRUNCATE NPM CACHE ==="
npm cache clean --force 2>/dev/null || true

echo ""
echo "=== CLEAR PIP CACHE ==="
pip cache purge 2>/dev/null || pip3 cache purge 2>/dev/null || true

echo ""
echo "=== DISK USAGE AFTER CLEANUP ==="
df -h /
echo ""
echo "DONE! Space freed."
