# ── backend/Dockerfile ──────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm install --production

# Copy all backend source files
COPY . .

# Ensure uploads folder exists inside container
RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "server.js"]