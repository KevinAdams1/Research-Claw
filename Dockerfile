# ============================================================
# Research-Claw (科研龙虾)
# ============================================================
FROM node:22-slim

# Native build tools for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ git curl ca-certificates psmisc \
    && rm -rf /var/lib/apt/lists/*

# pnpm — match version in package.json
RUN npm install -g pnpm@9.15.0

WORKDIR /app

# Rewrite git+ssh URLs to HTTPS so git works without SSH keys in Docker
RUN git config --global url."https://github.com/".insteadOf "git@github.com:"

# ── Dependency layer (cached unless package files change) ──────────────────
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY patches/ ./patches/
COPY dashboard/package.json                          ./dashboard/
COPY extensions/research-claw-core/package.json     ./extensions/research-claw-core/
COPY extensions/wentor-connect/package.json          ./extensions/wentor-connect/

RUN pnpm install --node-linker=hoisted && \
    # pnpm hard-links files from its content store (nlink > 1); OpenClaw rejects those.
    # cp -r creates fresh copies (new inodes, nlink=1) to satisfy the path guard.
    cp -r node_modules/@wentorai/research-plugins /tmp/rp-clean && \
    rm -rf node_modules/@wentorai/research-plugins && \
    mv /tmp/rp-clean node_modules/@wentorai/research-plugins

# ── Source + build ─────────────────────────────────────────────────────────
COPY . .

RUN pnpm build

# Bake config template outside the config volume path so entrypoint can seed it
RUN mkdir -p /defaults && cp config/openclaw.example.json /defaults/openclaw.example.json

# ── Runtime ────────────────────────────────────────────────────────────────
COPY scripts/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 28789

ENTRYPOINT ["/entrypoint.sh"]
