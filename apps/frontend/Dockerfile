# ── Stage 1: Build ──────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Serve (nginx) ──────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# TODO: nginx.conf 커스터마이징 필요 시 아래 주석 해제
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]