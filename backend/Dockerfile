# Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY .npmrc ./
RUN npm install --legacy-peer-deps

# Copy source and Prisma schema
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma ./prisma/
COPY src ./src/

# Generate Prisma client and compile
RUN npx prisma generate
RUN npm run build

# Production Stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production-only dependencies
COPY package*.json ./
COPY .npmrc ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy generated Prisma artifacts & built code
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Non-root security user
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
