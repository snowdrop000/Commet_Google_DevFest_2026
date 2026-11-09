FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.api.json ./
COPY server ./server
COPY shared ./shared
COPY tsconfig.web.json ./
COPY web ./web
COPY extension/ui ./extension/ui
COPY extension/sns ./extension/sns
COPY extension/core/messages.ts ./extension/core/messages.ts
COPY extension/assets/fonts ./extension/assets/fonts
COPY assets/characters ./assets/characters
ARG WXT_FIREBASE_API_KEY
ARG WXT_FIREBASE_PROJECT_ID
ARG WXT_FIREBASE_AUTH_DOMAIN
ARG WXT_FIREBASE_APP_ID
RUN npm run typecheck:api && npm run build:api && npm run typecheck:web && npm run build:web

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "dist/server.js"]
