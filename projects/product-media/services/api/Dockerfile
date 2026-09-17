FROM node:22.13.0-alpine3.21 AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npx tsc -p tsconfig.build.json

FROM node:22.13.0-alpine3.21 AS runtime
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=384
WORKDIR /app
RUN addgroup -g 10001 -S app && adduser -u 10001 -S app -G app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && chown -R 10001:10001 /app
COPY --from=build --chown=10001:10001 /build/dist ./dist
USER 10001
EXPOSE 3000
CMD ["node", "dist/main.js"]
