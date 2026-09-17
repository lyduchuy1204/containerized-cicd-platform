FROM node:22.13.0-alpine3.21 AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npx tsc -p tsconfig.json && npx vite build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
USER root
RUN addgroup -g 10001 -S app \
  && adduser -u 10001 -S app -G app \
  && mkdir -p /tmp/nginx/client-body /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/uwsgi /tmp/nginx/scgi \
  && chown -R 10001:10001 /tmp/nginx \
  && rm -rf /usr/share/nginx/html/*
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build --chown=10001:10001 /build/dist /usr/share/nginx/html
USER 10001:10001
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
