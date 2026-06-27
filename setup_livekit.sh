#!/bin/bash
# ============================================================================
# LiveKit Self-Hosted Setup Script
# Run this on your EC2 server AFTER:
#   1. Resizing to t3.xlarge
#   2. Adding DNS: lk.workflow-tech.info → A → <EC2-public-IP>
#   3. Opening ports in AWS Security Group (see implementation_plan.md)
#   4. git pull origin main
# ============================================================================

set -e

echo "============================================"
echo "  LiveKit Self-Hosted Setup"
echo "============================================"
echo ""

# Step 1: Generate API keys
echo "📦 Generating LiveKit API keys..."
KEYS_OUTPUT=$(docker run --rm livekit/generate --keys 2>&1)
echo "$KEYS_OUTPUT"

# Extract key and secret from output
API_KEY=$(echo "$KEYS_OUTPUT" | grep -oP 'API Key:\s*\K\S+' || echo "")
API_SECRET=$(echo "$KEYS_OUTPUT" | grep -oP 'API Secret:\s*\K\S+' || echo "")

if [ -z "$API_KEY" ] || [ -z "$API_SECRET" ]; then
    echo ""
    echo "⚠️  Could not auto-extract keys from output."
    echo "Please enter them manually from the output above:"
    read -p "API Key: " API_KEY
    read -p "API Secret: " API_SECRET
fi

echo ""
echo "🔑 API Key:    $API_KEY"
echo "🔐 API Secret: $API_SECRET"
echo ""

# Step 2: Replace placeholders in config files
echo "📝 Updating config files..."

sed -i "s|REPLACE_WITH_API_KEY: REPLACE_WITH_API_SECRET|${API_KEY}: ${API_SECRET}|g" livekit/livekit.yaml
sed -i "s|REPLACE_WITH_API_KEY|${API_KEY}|g" livekit/egress.yaml
sed -i "s|REPLACE_WITH_API_SECRET|${API_SECRET}|g" livekit/egress.yaml
sed -i "s|REPLACE_WITH_API_KEY|${API_KEY}|g" livekit/sip.yaml
sed -i "s|REPLACE_WITH_API_SECRET|${API_SECRET}|g" livekit/sip.yaml

echo "  ✅ livekit/livekit.yaml"
echo "  ✅ livekit/egress.yaml"
echo "  ✅ livekit/sip.yaml"
echo "  ✅ livekit/caddy.yaml (no keys needed)"

# Step 3: Update .env
echo ""
echo "📝 Updating .env..."
sed -i "s|REPLACE_WITH_GENERATED_KEY|${API_KEY}|g" .env
sed -i "s|REPLACE_WITH_GENERATED_SECRET|${API_SECRET}|g" .env
echo "  ✅ .env updated"

# Step 4: Deploy
echo ""
echo "🚀 Deploying all services..."
sudo docker compose down
sudo docker compose up -d --build

echo ""
echo "⏳ Waiting 15 seconds for services to start..."
sleep 15

# Step 5: Health checks
echo ""
echo "============================================"
echo "  Health Checks"
echo "============================================"

echo ""
echo "📡 LiveKit Server:"
curl -s http://localhost:7880 && echo " ✅" || echo " ❌ FAILED"

echo ""
echo "📡 Redis:"
docker exec $(docker ps -qf "ancestor=redis:7-alpine") redis-cli ping 2>/dev/null && echo " ✅" || echo " ❌ FAILED"

echo ""
echo "📦 Container Status:"
sudo docker compose ps

echo ""
echo "============================================"
echo "  NEXT STEPS"
echo "============================================"
echo ""
echo "1. Check logs:"
echo "   docker logs livekit --tail 20"
echo "   docker logs livekit-egress --tail 20"
echo "   docker logs livekit-sip --tail 20"
echo "   docker logs caddy --tail 20"
echo ""
echo "2. Re-create SIP trunks:"
echo "   → Outbound: Dashboard → Settings → click 'Setup Trunk'"
echo "   → Inbound:  Run the lk CLI commands from the plan"
echo ""
echo "3. Test a call from Dashboard → Single Call"
echo ""
echo "🔑 Your LiveKit keys (save these!):"
echo "   API Key:    $API_KEY"
echo "   API Secret: $API_SECRET"
echo "   URL:        wss://lk.workflow-tech.info"
echo ""
echo "🔄 To rollback to LiveKit Cloud, see the Rollback section in the plan."
echo ""
