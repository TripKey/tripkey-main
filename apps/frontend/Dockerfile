FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# TODO: nginx.conf에서 API 프록시 설정이 dev와 prod에서 다르므로, Vite 설정과 마찬가지로 nginx.conf도 dev/prod 버전 분리 필요 --- IGNORE ---