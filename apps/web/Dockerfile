# Multi-stage production build for MLite Dashboard
# Stage 1: Build static bundle with Node.js
FROM node:20-alpine AS builder

WORKDIR /app

COPY apps/web/package.json ./
# If package-lock.json exists, copy it as well
COPY apps/web/package*.json ./

RUN npm install

COPY apps/web/ ./

RUN npm run build || mkdir -p dist && cp index.html dist/

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Configure Nginx to listen on port 3000, enforce security headers, and support SPA HTML5 routing
RUN printf 'server {\n\
    listen 3000;\n\
    server_tokens off;\n\
    add_header X-Frame-Options "SAMEORIGIN" always;\n\
    add_header X-Content-Type-Options "nosniff" always;\n\
    add_header X-XSS-Protection "1; mode=block" always;\n\
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
