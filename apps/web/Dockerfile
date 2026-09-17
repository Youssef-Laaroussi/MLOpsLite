# Multi-stage / lightweight web server for MLite Dashboard
FROM nginx:alpine

COPY apps/web/index.html /usr/share/nginx/html/index.html

# Configure Nginx to listen on port 3000
RUN sed -i 's/listen       80;/listen       3000;/g' /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
