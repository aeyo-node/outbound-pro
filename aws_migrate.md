# Swaram AI Server — AWS Migration Guide

> **Goal:** Move your Swaram AI platform from the old EC2 server to a new one with zero downtime.
> Written for complete beginners. Follow every step in order.

---

## 📋 Before You Start — Collect These From Your OLD Server

SSH into your old server first and collect all the values you will need:

```bash
# 1. Print your entire .env file (copy this somewhere safe!)
cat ~/outbound-pro/.env

# 2. Print your LiveKit config
cat ~/outbound-pro/livekit/livekit.yaml
cat ~/outbound-pro/livekit/sip.yaml
cat ~/outbound-pro/livekit/egress.yaml

# 3. Print your Nginx config
sudo cat /etc/nginx/sites-enabled/swaram   # or whatever your file is named
sudo ls /etc/nginx/sites-enabled/

# 4. Note your Elastic IP (or current public IP)
curl -s http://169.254.169.254/latest/meta-data/public-ipv4

# 5. Note your domain names (e.g. lk.workflow-tech.info, app.workflow-tech.info)
sudo certbot certificates
```

> **Save everything above in a text file on your local computer before proceeding.**

---

## PART 1 — Set Up Your NEW EC2 Instance

### Step 1.1 — Launch the New Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Choose:
   - **AMI:** Ubuntu Server 24.04 LTS (or 22.04 LTS)
   - **Instance type:** `t3.large` (2 vCPU, 8 GB RAM — minimum recommended)
   - **Storage:** 16 GB gp3 root volume *(not 28 GB — you only need 16 GB)*
   - **Key pair:** Use the SAME key pair as your old server (so you can SSH with the same `.pem` file)
3. Under **Network Settings:**
   - Select the **same VPC** as your old server
   - Enable **Auto-assign public IP** → **Disable** (you will assign an Elastic IP)
4. Click **Launch**

### Step 1.2 — Assign an Elastic IP to the New Server

> An Elastic IP is a fixed public IP that stays the same even if you restart the server.

1. In AWS Console → **EC2 → Elastic IPs**
2. Click **Allocate Elastic IP address** → **Allocate**
3. Select the new IP → **Actions → Associate Elastic IP**
4. Choose your **new instance** → **Associate**
5. Note down this IP — you will use it everywhere below

### Step 1.3 — Configure Security Groups (Firewall Rules)

Your new instance needs the SAME firewall rules as the old one.

1. Go to **EC2 → Security Groups → Create Security Group**
2. Name it `swaram-production`
3. Add these **Inbound Rules** exactly:

| Type | Protocol | Port Range | Source | Purpose |
|---|---|---|---|---|
| SSH | TCP | 22 | My IP | Remote access |
| HTTP | TCP | 80 | 0.0.0.0/0 | SSL certificate verification |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Web dashboard |
| Custom TCP | TCP | 8000 | 0.0.0.0/0 | FastAPI backend |
| Custom TCP | TCP | 7880 | 0.0.0.0/0 | LiveKit WebSocket (WSS) |
| Custom TCP | TCP | 7881 | 0.0.0.0/0 | LiveKit WebRTC TCP |
| Custom TCP | TCP | 7882 | 0.0.0.0/0 | LiveKit TURN/TLS |
| Custom UDP | UDP | 7882 | 0.0.0.0/0 | LiveKit TURN/UDP |
| Custom UDP | UDP | 5060 | 0.0.0.0/0 | SIP signaling |
| Custom UDP | UDP | 10000-60000 | 0.0.0.0/0 | SIP/RTP media (audio) |

4. Attach this security group to your **new instance**

---

## PART 2 — Install Everything on the New Server

SSH into your **new server**:
```bash
ssh -i your-key.pem ubuntu@<NEW_ELASTIC_IP>
```

### Step 2.1 — Install Docker

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Allow ubuntu user to run docker without sudo
sudo usermod -aG docker ubuntu

# Install Docker Compose plugin
sudo apt-get install -y docker-compose-plugin

# Verify installations
docker --version
docker compose version

# Log out and back in for group changes to apply
exit
```

SSH back in:
```bash
ssh -i your-key.pem ubuntu@<NEW_ELASTIC_IP>
```

### Step 2.2 — Install Nginx and Certbot (SSL)

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Step 2.3 — Install Git and Clone the Repository

```bash
# Install git
sudo apt-get install -y git

# Clone your project
cd ~
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git outbound-pro
cd outbound-pro
```

> **If you don't have a GitHub repo**, copy the files from the old server instead:
> ```bash
> # Run this on your LOCAL computer (not the server):
> scp -i your-key.pem -r ubuntu@<OLD_IP>:~/outbound-pro ubuntu@<NEW_IP>:~/outbound-pro
> ```

### Step 2.4 — Copy Your .env File

Create the `.env` file on the new server using the values you collected earlier:

```bash
nano ~/outbound-pro/.env
```

Paste ALL the contents from your old `.env` file exactly. Save with `Ctrl+X → Y → Enter`.

---

## PART 3 — Configure DNS & SSL

### Step 3.1 — Update DNS Records

> You need to point your domains to the NEW server's Elastic IP.

In your DNS provider (e.g. Cloudflare, Route53, GoDaddy):

Update **ALL** of these A records to point to `<NEW_ELASTIC_IP>`:

| Domain | Type | New Value |
|---|---|---|
| `app.workflow-tech.info` (dashboard) | A | `<NEW_ELASTIC_IP>` |
| `lk.workflow-tech.info` (LiveKit) | A | `<NEW_ELASTIC_IP>` |
| `api.workflow-tech.info` (if exists) | A | `<NEW_ELASTIC_IP>` |

> ⏳ DNS changes can take 5–30 minutes to propagate. You can check with:
> ```bash
> dig +short app.workflow-tech.info
> ```
> Wait until it shows your new IP before proceeding.

### Step 3.2 — Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/swaram
```

Paste this configuration (replace domain names with yours):

```nginx
# ── LiveKit WebSocket ─────────────────────────────────────────
server {
    server_name lk.workflow-tech.info;
    listen 80;

    location / {
        proxy_pass http://localhost:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
    }
}

# ── Swaram Dashboard ──────────────────────────────────────────
server {
    server_name app.workflow-tech.info;
    listen 80;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and test:
```bash
sudo ln -sf /etc/nginx/sites-available/swaram /etc/nginx/sites-enabled/swaram
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3.3 — Issue SSL Certificates

> Run AFTER DNS has propagated (verify with `dig` command above).

```bash
sudo certbot --nginx -d lk.workflow-tech.info -d app.workflow-tech.info \
  --non-interactive --agree-tos --email your@email.com
```

Certbot will automatically update your Nginx config with HTTPS. Verify:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## PART 4 — Configure LiveKit & SIP

### Step 4.1 — Update LiveKit Config With New IP

```bash
nano ~/outbound-pro/livekit/livekit.yaml
```

Find and update your public IP to `<NEW_ELASTIC_IP>`:
```yaml
rtc:
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: true
  # Make sure this is NOT hardcoded to old IP — use_external_ip: true handles it automatically
```

### Step 4.2 — Update SIP Config With New IP

```bash
nano ~/outbound-pro/livekit/sip.yaml
```

Replace any occurrence of your old server IP with `<NEW_ELASTIC_IP>`.

### Step 4.3 — Update Vobiz SIP Trunk (CRITICAL)

> Your SIP provider (Vobiz) has your old server's IP whitelisted. You MUST update it.

1. Log into your **Vobiz dashboard**
2. Go to **SIP Trunks / Outbound Trunks**
3. Find the trunk pointing to your old server IP
4. Change the **IP/Host** from `<OLD_IP>` to `<NEW_ELASTIC_IP>`
5. Also update the **IP Whitelist / ACL** if there is one — add `<NEW_ELASTIC_IP>` and remove `<OLD_IP>`

---

## PART 5 — Launch the New Server

### Step 5.1 — Remove Egress (saves 4.3 GB — recordings go to S3 directly)

```bash
# Edit docker-compose.yml to remove the livekit-egress service
nano ~/outbound-pro/docker-compose.yml
```

Delete the entire `livekit-egress:` block (from `# ── Egress` to the `- livekit` line).

### Step 5.2 — Start All Services

```bash
cd ~/outbound-pro

# First build (this takes 5-10 minutes)
sudo docker compose build

# Start everything
sudo docker compose up -d

# Watch the logs to confirm healthy startup
sudo docker compose logs -f --tail=50
```

Wait until you see:
- `✅ Supabase connected`
- `[AGENT] LiveKit worker started`
- `Started LiveKit AI agent worker`

### Step 5.3 — Set Up Daily Cleanup Cron

```bash
chmod +x ~/outbound-pro/cleanup.sh
bash ~/outbound-pro/setup_cron.sh
```

---

## PART 6 — Test Everything Before Switching

Do NOT shut down the old server until ALL of these pass:

```bash
# 1. Check all containers are healthy
sudo docker ps

# 2. Check dashboard loads
curl -s -o /dev/null -w "%{http_code}" https://app.workflow-tech.info
# Should return: 200

# 3. Check API is responding
curl https://app.workflow-tech.info/api/stats
# Should return JSON with stats

# 4. Check LiveKit is reachable
curl -s -o /dev/null -w "%{http_code}" https://lk.workflow-tech.info
# Should return: 200 or 101

# 5. Make a test call from the dashboard
# → Go to https://app.workflow-tech.info
# → Trigger a manual test call
# → Verify the agent answers and speaks
```

---

## PART 7 — Cut Over & Decommission Old Server

Once ALL tests pass:

### Step 7.1 — Stop the Old Server

```bash
# SSH into OLD server:
cd ~/outbound-pro
sudo docker compose down
sudo systemctl stop nginx
```

### Step 7.2 — (Optional) Move Old Elastic IP to New Server

If your old server had an Elastic IP that is referenced in the SIP trunk:

1. AWS Console → **Elastic IPs**
2. Select old IP → **Actions → Disassociate**
3. Then **Actions → Associate** → select the new instance
4. Update your Nginx on new server with this IP if needed

### Step 7.3 — Decommission Old Instance

1. AWS Console → EC2 → Select old instance
2. **Instance State → Stop** (wait 24 hours to confirm everything works)
3. Then **Instance State → Terminate** (this permanently deletes it)

> [!CAUTION]
> **Do NOT terminate immediately.** Stop it first and keep it stopped for 24-48 hours. If anything breaks, you can restart it quickly as a fallback.

---

## 🔍 Troubleshooting

### Agent not connecting to LiveKit
```bash
sudo docker compose logs swaram --tail=50 | grep -i "livekit\|error\|connect"
# Check LIVEKIT_URL is set to ws://livekit:7880 (internal, not public URL)
```

### SIP calls not going through
```bash
sudo docker compose logs livekit-sip --tail=30
# → Check Vobiz IP whitelist was updated
# → Check UDP ports 5060 and 10000-60000 are open in Security Group
```

### SSL certificate error
```bash
sudo certbot renew --dry-run
sudo nginx -t
# → Ensure DNS has propagated before running certbot
```

### Dashboard shows no data
```bash
# → Check .env has correct SUPABASE_URL and SUPABASE_SERVICE_KEY
sudo docker compose logs swaram --tail=20 | grep -i supabase
```

---

## ✅ Final Checklist

- [ ] New EC2 instance launched (t3.large, 16GB storage)
- [ ] Elastic IP assigned to new instance
- [ ] Security Group has all required ports open
- [ ] Docker installed and running
- [ ] Repository cloned
- [ ] `.env` file copied exactly from old server
- [ ] DNS A records updated to new IP
- [ ] Nginx configured and SSL issued
- [ ] LiveKit + SIP configs updated with new IP
- [ ] Vobiz SIP trunk IP updated to new server
- [ ] `docker compose up -d` successful, all containers healthy
- [ ] Dashboard loads at HTTPS URL
- [ ] Test call completes successfully
- [ ] Daily cleanup cron scheduled (`bash setup_cron.sh`)
- [ ] Old server **stopped** (not terminated — wait 24h)
- [ ] Old server **terminated** after 24h confirmation

---

## PART 8 — Cut Your AWS Bill by up to 65% (Reserved Instances)

> Do this AFTER your new server is confirmed stable for at least 48 hours.
> Never commit to a Reserved Instance on a server you might terminate.

### What is a Reserved Instance?

By default you pay AWS **On-Demand** pricing — you pay full price by the hour, no commitment.
A **Reserved Instance (RI)** is a 1-year or 3-year commitment in exchange for a massive discount.
You are not reserving a specific server — you are reserving the **right to run that instance type** at a lower rate.

### Cost Comparison: t3.large in ap-south-1 (Mumbai)

| Plan | Commitment | Upfront | Monthly Cost | Savings vs On-Demand |
|---|---|---|---|---|
| **On-Demand** (current) | None | $0 | ~$60/month | — |
| **1-Year RI** (No Upfront) | 1 year | $0 | ~$39/month | **35% off** |
| **1-Year RI** (Partial Upfront) | 1 year | ~$215 | ~$18/month | **45% off** |
| **1-Year RI** (All Upfront) | 1 year | ~$390 | $0/month | **45% off** |
| **3-Year RI** (All Upfront) | 3 years | ~$667 | $0/month | **63% off** |
| **Compute Savings Plan** | 1 year | $0 | ~$39/month | **35% off** *(flexible)* |

> **Recommendation: 1-Year No Upfront Reserved Instance**
> - Zero money down, starts saving immediately
> - 35% cheaper than what you pay today
> - If you need to stop: sell it on the **AWS Marketplace for Reserved Instances**

### Option A — Purchase a Reserved Instance (Best for fixed instance type)

1. Go to **AWS Console → EC2 → Reserved Instances** (left sidebar)
2. Click **Purchase Reserved Instances**
3. Set these filters:
   - **Platform:** Linux/UNIX
   - **Instance type:** `t3.large`
   - **Region:** Asia Pacific (Mumbai) — `ap-south-1`
   - **Term:** 1 Year
   - **Payment option:** No Upfront *(zero cash today, billed monthly)*
   - **Tenancy:** Default (Shared)
4. Review the price shown → Click **Add to Cart**
5. Click **Order** — savings apply **immediately and automatically**

> No configuration needed after purchase. AWS automatically applies the discount to any matching running instance in your account.

### Option B — Compute Savings Plan (Best for flexibility)

A Savings Plan works like a Reserved Instance but is **not locked to t3.large specifically**.
If you ever change instance type or region, the discount still applies.

1. Go to **AWS Console → Cost Management → Savings Plans**
2. Click **Purchase Savings Plans**
3. Choose:
   - **Savings Plan type:** Compute Savings Plans
   - **Term:** 1 year
   - **Payment:** No upfront
   - **Hourly commitment:** Enter `$0.054` *(the t3.large discounted rate)*
4. Review estimated savings shown → **Purchase**

### Option C — Spot Instances (Not recommended for this use case)

Spot Instances can be up to 90% cheaper BUT AWS can terminate them with 2 minutes warning.
This would kill all active phone calls instantly. **Do not use Spot for production.**

### How to Check You Are Saving Money

After purchasing:
1. Go to **AWS Console → Cost Management → Cost Explorer**
2. Enable hourly granularity
3. You will see the Reserved Instance discount applied as a **negative line item** (credit)
4. You can also go to **EC2 → Reserved Instances → My Reserved Instances** to confirm it shows as `active`

### Can I Cancel a Reserved Instance?

You cannot cancel, but you CAN:
- **Sell it** on the [AWS Reserved Instance Marketplace](https://aws.amazon.com/ec2/purchasing-options/reserved-instances/marketplace/)
- **Modify it** to a different size within the same family (e.g. t3.large → t3.xlarge)

> [!TIP]
> If you plan to scale up later (more clients, more calls), buy a **t3.large RI now** and when you need to upgrade, modify it to **t3.xlarge** — you only pay the price difference.
