FROM node:22-bookworm-slim AS deps

WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm install

FROM node:22-bookworm-slim AS dev

WORKDIR /workspace
ENV NODE_ENV=development

COPY --from=deps /workspace/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

