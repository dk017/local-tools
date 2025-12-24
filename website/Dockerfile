# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (package.json is required)
COPY package.json ./
COPY package-lock.json* ./
COPY pnpm-lock.yaml* ./
COPY yarn.lock* ./

# Install dependencies (use appropriate package manager based on lockfile)
# Try npm ci first, but fall back to npm install if lock file is out of sync
RUN if [ -f "package-lock.json" ]; then \
      npm ci || npm install; \
    elif [ -f "yarn.lock" ]; then \
      yarn install --frozen-lockfile || yarn install; \
    elif [ -f "pnpm-lock.yaml" ]; then \
      npm install -g pnpm && (pnpm install --frozen-lockfile || pnpm install); \
    else \
      npm install; \
    fi

# Copy source code
COPY . .

# Build Next.js app (use appropriate package manager)
RUN if [ -f "package-lock.json" ]; then \
      npm run build; \
    elif [ -f "yarn.lock" ]; then \
      yarn build; \
    elif [ -f "pnpm-lock.yaml" ]; then \
      pnpm build; \
    else \
      npm run build; \
    fi

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Start Next.js
CMD ["node", "server.js"]

