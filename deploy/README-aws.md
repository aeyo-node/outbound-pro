# OutboundAI — AWS EC2 Deployment Guide

## Prerequisites
- AWS Account
- EC2 instance: **Ubuntu 22.04 LTS**, minimum **t3.small** (2 vCPU, 2 GB RAM)
- Security Group inbound rules:
  - Port 22 (SSH) — your IP
  - Port 8000 (HTTP) — 0.0.0.0/0

---

## Step 1 — Launch EC2 Instance

```bash
# In AWS Console:
# EC2 → Launch Instance → Ubuntu Server 22.04 LTS → t3.small
# Key pair: create or use existing
# Security group: allow 22, 8000
```

---

## Step 2 — SSH into the Instance

```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

---

## Step 3 — Upload the Project

**Option A — Git clone (recommended):**
```bash
git clone https://github.com/your-repo/outbound-pro.git /home/ubuntu/outboundai
cd /home/ubuntu/outboundai
```

**Option B — SCP upload:**
```bash
# From your local machine:
scp -i your-key.pem -r C:/Users/chris/Documents/outbound-pro/* ubuntu@<EC2-IP>:/home/ubuntu/outboundai/
```

---

## Step 4 — Run Setup Script

```bash
cd /home/ubuntu/outboundai
bash deploy/setup-ec2.sh
```

This installs Docker, creates a systemd service, and configures the firewall.

---

## Step 5 — Configure Environment

```bash
cp .env.example .env
nano .env
```

Fill in all values:
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `GOOGLE_API_KEY` (Gemini Live)
- `VOBIZ_SIP_DOMAIN`, `VOBIZ_USERNAME`, `VOBIZ_PASSWORD`, `VOBIZ_OUTBOUND_NUMBER`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`

---

## Step 6 — Run Supabase Schema

1. Go to **supabase.com** → your project → **SQL Editor**
2. Paste the contents of `supabase_schema.sql`
3. Click **Run**

---

## Step 7 — Build and Start

```bash
docker compose build
sudo systemctl start outboundai
sudo systemctl status outboundai
```

---

## Step 8 — Open Dashboard

```
http://<EC2-PUBLIC-IP>:8000
```

---

## Step 9 — Create SIP Trunk

1. Dashboard → **⚙️ Settings** → fill in LiveKit + Gemini + Vobiz → **Save** each section
2. Click **⚡ Create SIP Trunk in LiveKit**
3. The `OUTBOUND_TRUNK_ID` is saved automatically

---

## Step 10 — Test a Call

1. Dashboard → **📞 Single Call**
2. Enter your phone number (+91...)
3. Click **Initiate Call**
4. You should hear Priya speaking within 5–10 seconds of pickup

---

## Useful Commands

```bash
# View live logs
sudo journalctl -u outboundai -f

# View container logs
docker compose logs -f

# Restart
sudo systemctl restart outboundai

# Stop
sudo systemctl stop outboundai

# Update and redeploy
git pull
docker compose build --no-cache
sudo systemctl restart outboundai
```

---

## Optional — HTTPS with Nginx + Let's Encrypt

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Point a domain (e.g. calls.yourdomain.com) to your EC2 IP first, then:
sudo certbot --nginx -d calls.yourdomain.com

# Nginx reverse proxy config:
sudo tee /etc/nginx/sites-available/outboundai > /dev/null <<'EOF'
server {
    server_name calls.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/outboundai /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Cost Estimate (AWS)

| Resource | Cost |
|---|---|
| t3.small EC2 | ~$15/month |
| EBS 20GB | ~$2/month |
| Data transfer | ~$1/month |
| **Total** | **~$18/month** |

---

## Architecture on EC2

```
EC2 (t3.small) :8000
└── Docker container
    ├── FastAPI (uvicorn) ← serves dashboard + REST API
    └── LiveKit agent worker ← Gemini Live voice AI
        │
        ├── LiveKit Cloud (wss) ← audio routing
        ├── Vobiz SIP ← PSTN telephony
        ├── Supabase ← database
        └── Gemini Live API ← AI voice (STT + LLM + TTS)
```
