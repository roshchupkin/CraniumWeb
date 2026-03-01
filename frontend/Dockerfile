# CraniumWeb Frontend - React + Vite dev server
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Vite dev server; --host 0.0.0.0 for container access
# Proxy /api to backend (set in vite.config via env)
EXPOSE 5173

CMD ["npm", "run", "dev"]
