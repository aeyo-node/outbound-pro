FROM python:3.11-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
        libgomp1 \
        libglib2.0-0 \
        libsndfile1 \
        curl \
        gnupg \
    && rm -rf /var/lib/apt/lists/*

# ── Install Node.js 20 LTS ───────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python dependencies ──────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# ── Next.js dependencies & build ─────────────────────────────────────────────
COPY swaram-dashboard/package.json swaram-dashboard/package-lock.json* swaram-dashboard/
RUN cd swaram-dashboard && npm install --production=false

# ── Copy all source code ─────────────────────────────────────────────────────
COPY . .

# ── Build Next.js for production ─────────────────────────────────────────────
RUN cd swaram-dashboard && npm run build

RUN mkdir -p /data

EXPOSE 8000 3000

CMD ["sh", "start.sh"]
